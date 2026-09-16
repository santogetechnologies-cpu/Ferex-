import React, { useState, useEffect, useCallback } from 'react';
import { Boxes, Search, Plus, Trash2, X, CheckCircle2, Snowflake, AlertTriangle, ArrowRightLeft, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getRimiInventory,
  getRimiProducts,
  createRimiInventoryItem,
  deleteRimiInventoryItem,
  getRimiFrostLosses,
  recordRimiFrostLoss,
  deleteRimiFrostLoss,
  getRimiStockAdjustments,
  recordRimiStockAdjustment,
  deleteRimiStockAdjustment,
  type RimiFrostLoss,
  type RimiStockAdjustment
} from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';
import { useRimiPermissions } from '../../hooks/usePermissions';

export const RimiInventory: React.FC = () => {
  const { isAdmin, isCentral, canDelete } = useRimiPermissions();
  const [activeTab, setActiveTab] = useState<'stock' | 'frost_loss' | 'adjustments'>('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [frostLosses, setFrostLosses] = useState<RimiFrostLoss[]>([]);
  const [adjustments, setAdjustments] = useState<RimiStockAdjustment[]>([]);

  // Modals
  const [showInwardModal, setShowInwardModal] = useState(false);
  const [showFrostLossModal, setShowFrostLossModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  const emptyInward = {
    product_id: '',
    batch_number: '',
    warehouse_location: '',
    quantity: '' as any,
    mfg_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    reserved_qty: 0,
    low_stock_threshold: 50
  };
  const emptyFrostLoss = { product_name: '', batch_number: '', warehouse_location: '', quantity_lost_kg: '' as any, loss_reason: '' as any, estimated_loss_value: '' as any };
  const emptyAdjustment = { product_name: '', adjustment_type: '' as any, quantity: '' as any, unit: '', source_location: '', target_location: '', reason: '' };

  const [newInward, setNewInward] = useState(emptyInward);
  const [newFrostLoss, setNewFrostLoss] = useState(emptyFrostLoss);
  const [newAdjustment, setNewAdjustment] = useState(emptyAdjustment);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invData, prodData, lossesData, adjData] = await Promise.all([
        getRimiInventory(),
        getRimiProducts(),
        getRimiFrostLosses(),
        getRimiStockAdjustments()
      ]);
      setProducts(prodData);
      setFrostLosses(lossesData);
      setAdjustments(adjData);

      if (Array.isArray(invData) && invData.length > 0) {
        const mapped = invData.map((d: any) => {
          const qtyOnHand = Number(d.quantity_on_hand) || 0;
          const reservedQty = Number(d.reserved_quantity != null ? d.reserved_quantity : Math.round(qtyOnHand * 0.15));
          const availableQty = Math.max(0, qtyOnHand - reservedQty);
          const threshold = Number(d.low_stock_threshold || d.product?.reorder_level || 50);
          const isLowStock = availableQty <= threshold;
          const mfgDate = d.mfg_date || (d.expiry_date ? new Date(new Date(d.expiry_date).getTime() - 365 * 86400000).toISOString().split('T')[0] : '2026-01-15');

          return {
            id: d.id,
            batchNo: d.batch_number || 'LOT-GEN',
            productName: d.product?.name || 'Frozen SKU',
            warehouse: d.warehouse_location || 'Mumbai Central Deep Freeze',
            quantityNum: qtyOnHand,
            reservedQty,
            availableQty,
            lowStockThreshold: threshold,
            mfgDate,
            unitPrice: Number(d.product?.unit_price || 500),
            quantity: `${availableQty} / ${qtyOnHand} ${d.product?.unit || 'KG'}`,
            valuation: `₹${(qtyOnHand * Number(d.product?.unit_price || 500)).toLocaleString('en-IN')}`,
            expiryDate: d.expiry_date,
            status: !isLowStock ? 'Optimal Stock' : 'Low Stock Reorder',
            statusBadge: !isLowStock ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
          };
        });
        setStockItems(mapped);
      } else {
        setStockItems([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_rimi_inventory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_inventory' }, () => loadData())
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_rimi_inventory_change', handleLocalChange);
    window.addEventListener('ferex_rimi_frost_losses_change', handleLocalChange);
    window.addEventListener('ferex_rimi_stock_adjustments_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_inventory_change', handleLocalChange);
      window.removeEventListener('ferex_rimi_frost_losses_change', handleLocalChange);
      window.removeEventListener('ferex_rimi_stock_adjustments_change', handleLocalChange);
    };
  }, [loadData]);

  // Handle Inward Stock
  const handleAddInward = async (e: React.FormEvent) => {
    e.preventDefault();
    const prodId = newInward.product_id || (products.length > 0 ? products[0].id : 'PROD-01');
    const matchedProd = products.find(p => p.id === prodId);
    const qty = Number(newInward.quantity) || 100;
    const reserved = Number(newInward.reserved_qty) || 0;
    const threshold = Number(newInward.low_stock_threshold) || 50;
    const mfg = newInward.mfg_date || new Date().toISOString().split('T')[0];
    const batchNo = newInward.batch_number || `LOT-2026-${Math.floor(100 + Math.random() * 900)}`;

    const created = await createRimiInventoryItem({
      product_id: prodId,
      batch_number: batchNo,
      warehouse_location: newInward.warehouse_location || 'Central Cold Storage',
      quantity_on_hand: qty,
      reserved_quantity: reserved,
      low_stock_threshold: threshold,
      mfg_date: mfg,
      expiry_date: newInward.expiry_date || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]
    });

    if (created) {
      await loadData();
    }

    setShowInwardModal(false);
    setNewInward(emptyInward);
    showToastMsg(`Inwarded stock batch ${batchNo}`);
  };

  // Handle Frost Loss Incident
  const handleRecordFrostLoss = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await recordRimiFrostLoss({
      product_name: newFrostLoss.product_name,
      batch_number: newFrostLoss.batch_number,
      warehouse_location: newFrostLoss.warehouse_location,
      quantity_lost_kg: Number(newFrostLoss.quantity_lost_kg) || 0,
      loss_reason: newFrostLoss.loss_reason,
      estimated_loss_value: Number(newFrostLoss.estimated_loss_value) || 0
    });

    if (created) {
      setFrostLosses(prev => [created, ...prev]);
    }

    setShowFrostLossModal(false);
    showToastMsg(`Recorded frost loss incident for ${newFrostLoss.product_name}`);
    setNewFrostLoss(emptyFrostLoss);
  };

  // Handle Stock Adjustment / Transfer
  const handleRecordAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await recordRimiStockAdjustment({
      product_name: newAdjustment.product_name,
      adjustment_type: newAdjustment.adjustment_type,
      quantity: Number(newAdjustment.quantity) || 0,
      unit: newAdjustment.unit,
      source_location: newAdjustment.source_location,
      target_location: newAdjustment.target_location,
      reason: newAdjustment.reason
    });

    if (created) {
      setAdjustments(prev => [created, ...prev]);
    }

    setShowAdjustmentModal(false);
    showToastMsg(`Stock adjustment recorded successfully!`);
    setNewAdjustment(emptyAdjustment);
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteRimiInventoryItem(id);
      setStockItems(prev => prev.filter(s => s.id !== id));
      showToastMsg('Removed stock record');
    } catch (err: any) {
      showToastMsg(`Error deleting inventory item: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDeleteFrostLoss = async (id: string) => {
    try {
      await deleteRimiFrostLoss(id);
      setFrostLosses(prev => prev.filter(f => f.id !== id));
      showToastMsg('Deleted frost loss record');
    } catch (err: any) {
      showToastMsg(`Error deleting frost loss: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDeleteAdjustment = async (id: string) => {
    try {
      await deleteRimiStockAdjustment(id);
      setAdjustments(prev => prev.filter(a => a.id !== id));
      showToastMsg('Removed stock adjustment record');
    } catch (err: any) {
      showToastMsg(`Error deleting adjustment: ${err.message || 'Unknown error'}`);
    }
  };

  const handleExportCSV = () => {
    if (activeTab === 'stock') {
      const headers = ['Product,Batch,Warehouse,Quantity,Valuation,Expiry,Status\n'];
      const rows = stockItems.map(s => `"${s.productName}","${s.batchNo}","${s.warehouse}","${s.quantity}","${s.valuation}","${s.expiryDate}","${s.status}"\n`);
      const blob = new Blob([...headers, ...rows], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rimi_Cold_Stock_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else if (activeTab === 'frost_loss') {
      const headers = ['ID,Product,Batch,Warehouse,Loss (KG),Reason,Loss Value (INR),Date\n'];
      const rows = frostLosses.map(f => `"${f.id}","${f.product_name}","${f.batch_number}","${f.warehouse_location}","${f.quantity_lost_kg}","${f.loss_reason}","${f.estimated_loss_value}","${f.recorded_at}"\n`);
      const blob = new Blob([...headers, ...rows], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rimi_Frost_Loss_Report_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }
    showToastMsg('Exported CSV report');
  };

  const totalStockValuation = stockItems.reduce((sum, item) => sum + (item.quantityNum * item.unitPrice), 0);
  const totalFrostLossValuation = frostLosses.reduce((sum, loss) => sum + (Number(loss.estimated_loss_value) || 0), 0);
  const totalFrostLossKg = frostLosses.reduce((sum, loss) => sum + (Number(loss.quantity_lost_kg) || 0), 0);

  const filteredStock = stockItems.filter(s =>
    (s.productName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.warehouse || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.batchNo || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#58051E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Quick Action Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-5 h-5 text-[#58051E]" /> Cold Storage Inventory & Frost Loss Control
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Rimi Cold Chain ERP • Real-time SKU balances, sub-zero warehouse allocations, shrinkage, and frost loss write-offs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="text-xs font-bold border-slate-200" onClick={handleExportCSV}>
            <Download className="w-3.5 h-3.5 mr-1.5 text-[#58051E]" /> Export CSV
          </Button>
          {activeTab === 'stock' && (
            <Button size="sm" className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold" onClick={() => { setNewInward(emptyInward); setShowInwardModal(true); }}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Inward Stock
            </Button>
          )}
          {activeTab === 'frost_loss' && (isAdmin || isCentral) && (
            <Button size="sm" className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold" onClick={() => { setNewFrostLoss(emptyFrostLoss); setShowFrostLossModal(true); }}>
              <Snowflake className="w-3.5 h-3.5 mr-1.5" /> Log New Frost Loss
            </Button>
          )}
          {activeTab === 'adjustments' && (isAdmin || isCentral) && (
            <Button size="sm" className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold" onClick={() => { setNewAdjustment(emptyAdjustment); setShowAdjustmentModal(true); }}>
              <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" /> Cold Transfer / Adjust
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border border-slate-200/80 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Total Stock Valuation</span>
          <span className="text-xl font-black text-slate-900">₹{totalStockValuation.toLocaleString('en-IN')}</span>
          <span className="text-[10px] font-bold text-slate-500 block">{stockItems.length} Monitored SKU Batches</span>
        </Card>
        <Card className="p-4 border border-slate-200/80 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Frost Loss / Shrinkage</span>
          <span className="text-xl font-black text-rose-600">₹{totalFrostLossValuation.toLocaleString('en-IN')}</span>
          <span className="text-[10px] font-bold text-rose-500 block">{totalFrostLossKg.toFixed(1)} KG Total Weight Lost</span>
        </Card>
        <Card className="p-4 border border-slate-200/80 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Active Cold Rooms</span>
          <span className="text-xl font-black text-slate-900">4 Facilities</span>
          <span className="text-[10px] font-bold text-emerald-600 block">-18°C to -24°C Nominal</span>
        </Card>
        <Card className="p-4 border border-slate-200/80 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Stock Rebalance Logs</span>
          <span className="text-xl font-black text-slate-900">{adjustments.length} Logged</span>
          <span className="text-[10px] font-bold text-blue-600 block">Audited & Reconciled</span>
        </Card>
      </div>

      {/* Modern Tab Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'stock' ? 'bg-[#58051E] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Cold Storage Inventory ({stockItems.length})
        </button>
        <button
          onClick={() => setActiveTab('frost_loss')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'frost_loss' ? 'bg-[#58051E] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Frost Loss Incident Ledger ({frostLosses.length})
        </button>
        <button
          onClick={() => setActiveTab('adjustments')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'adjustments' ? 'bg-[#58051E] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Sub-Zero Transfers ({adjustments.length})
        </button>
      </div>

      {/* Tab 1: Stock Batches */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          <Card className="p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search SKU, batch code, or warehouse bay..."
                className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
              />
            </div>
            <span className="text-xs font-bold text-slate-400">{filteredStock.length} Active Lines</span>
          </Card>

          {loading ? (
            <div className="p-8 text-center text-xs font-bold text-slate-400">Loading cold chain inventory...</div>
          ) : filteredStock.length === 0 ? (
            <Card className="p-12 text-center border border-dashed border-slate-200">
              <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-black text-slate-800">No inventory balances recorded</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                There are no active stock batches inwarded. Record your first batch below.
              </p>
              <Button size="sm" className="mt-4 bg-[#58051E] hover:bg-[#430316] text-xs font-bold" onClick={() => setShowInwardModal(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Inward Stock Batch
              </Button>
            </Card>
          ) : (
            <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                      <th className="py-3 px-4">Product SKU & Batch</th>
                      <th className="py-3 px-4">Cold Warehouse Bay</th>
                      <th className="py-3 px-4">Available / Total Qty</th>
                      <th className="py-3 px-4">Reserved Qty</th>
                      <th className="py-3 px-4">Mfg & Expiry</th>
                      <th className="py-3 px-4">Threshold & Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {filteredStock.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-extrabold text-slate-900">
                          <div>{s.productName}</div>
                          <span className="text-[10px] font-bold text-slate-400">Batch: {s.batchNo}</span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{s.warehouse}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-black text-slate-900">{s.availableQty} KG</span>
                          <span className="text-[10px] text-slate-400 block font-normal">Total: {s.quantityNum} KG</span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-amber-700">
                          {s.reservedQty} KG
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-slate-700 font-semibold block">Exp: {s.expiryDate}</span>
                          <span className="text-[10px] text-slate-400 font-medium">Mfg: {s.mfgDate}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${s.statusBadge}`}>
                            {s.status}
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">Threshold: {s.lowStockThreshold} KG</span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {canDelete && (
                            <button onClick={() => handleDeleteItem(s.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded" title="Delete Stock Batch">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Tab 2: Frost Loss & Shrinkage */}
      {activeTab === 'frost_loss' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <h4 className="text-xs font-black text-amber-900">Frost Loss & Freezer Burn Telemetry</h4>
                <p className="text-[11px] font-semibold text-amber-700">
                  Tracking inventory write-offs caused by defrost cycle crystallization, package seal breaches, or temperature excursions.
                </p>
              </div>
            </div>
          </div>

          <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                    <th className="py-3 px-4">Loss ID & Product</th>
                    <th className="py-3 px-4">Batch #</th>
                    <th className="py-3 px-4">Cold Location</th>
                    <th className="py-3 px-4">Weight Lost (KG)</th>
                    <th className="py-3 px-4">Loss Reason</th>
                    <th className="py-3 px-4">Loss Value (₹)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {frostLosses.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        <div>{f.product_name}</div>
                        <span className="text-[10px] font-bold text-slate-400">{f.id}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">{f.batch_number}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{f.warehouse_location}</td>
                      <td className="py-3.5 px-4 font-black text-rose-600">{f.quantity_lost_kg} KG</td>
                      <td className="py-3.5 px-4 font-bold text-amber-800">{f.loss_reason}</td>
                      <td className="py-3.5 px-4 font-black text-rose-600">₹{Number(f.estimated_loss_value).toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-emerald-50 text-emerald-700 border-emerald-200 whitespace-nowrap">
                          {f.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button onClick={() => handleDeleteFrostLoss(f.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 3: Stock Adjustments & Transfers */}
      {activeTab === 'adjustments' && (
        <div className="space-y-4">
          <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                    <th className="py-3 px-4">Adjustment ID & SKU</th>
                    <th className="py-3 px-4">Adjustment Type</th>
                    <th className="py-3 px-4">Quantity</th>
                    <th className="py-3 px-4">Source → Target Location</th>
                    <th className="py-3 px-4">Reason / Audit Trail</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {adjustments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        <div>{a.product_name}</div>
                        <span className="text-[10px] font-bold text-slate-400">{a.id}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-blue-50 text-blue-700 border-blue-200">
                          {a.adjustment_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900">{a.quantity} {a.unit}</td>
                      <td className="py-3.5 px-4 text-slate-800 font-bold">
                        {a.source_location} {a.target_location ? `→ ${a.target_location}` : ''}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-semibold">{a.reason}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-400">{new Date(a.timestamp).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button onClick={() => handleDeleteAdjustment(a.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded" title="Delete Adjustment">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Inward Modal */}
      <AnimatePresence>
        {showInwardModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowInwardModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Inward Cold Storage Stock Batch</h3>
                <button onClick={() => setShowInwardModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddInward} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Target Product SKU</label>
                  <select value={newInward.product_id} onChange={(e) => setNewInward({ ...newInward, product_id: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Batch / Lot Code</label>
                  <input type="text" required value={newInward.batch_number} onChange={(e) => setNewInward({ ...newInward, batch_number: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Mfg Date</label>
                    <input type="date" required value={newInward.mfg_date} onChange={(e) => setNewInward({ ...newInward, mfg_date: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Expiry Date</label>
                    <input type="date" required value={newInward.expiry_date} onChange={(e) => setNewInward({ ...newInward, expiry_date: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Quantity (Total KG)</label>
                    <input type="number" required value={newInward.quantity} onChange={(e) => setNewInward({ ...newInward, quantity: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Reserved Qty (KG)</label>
                    <input type="number" value={newInward.reserved_qty} onChange={(e) => setNewInward({ ...newInward, reserved_qty: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Warehouse Location</label>
                    <input type="text" required value={newInward.warehouse_location} onChange={(e) => setNewInward({ ...newInward, warehouse_location: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Low Stock Alert (KG)</label>
                    <input type="number" value={newInward.low_stock_threshold} onChange={(e) => setNewInward({ ...newInward, low_stock_threshold: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowInwardModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">Inward Stock</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Frost Loss Modal */}
      <AnimatePresence>
        {showFrostLossModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowFrostLossModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Record Frost Loss Incident</h3>
                <button onClick={() => setShowFrostLossModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleRecordFrostLoss} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Product Name</label>
                  <input type="text" required value={newFrostLoss.product_name} onChange={(e) => setNewFrostLoss({ ...newFrostLoss, product_name: e.target.value })} placeholder="e.g. Norwegian Atlantic Salmon Fillets" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Batch #</label>
                    <input type="text" required value={newFrostLoss.batch_number} onChange={(e) => setNewFrostLoss({ ...newFrostLoss, batch_number: e.target.value })} placeholder="e.g. LOT-SAL-8821" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Weight Lost (KG)</label>
                    <input type="number" required value={newFrostLoss.quantity_lost_kg} onChange={(e) => setNewFrostLoss({ ...newFrostLoss, quantity_lost_kg: e.target.value as any })} placeholder="e.g. 15" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Loss Reason</label>
                  <select value={newFrostLoss.loss_reason} onChange={(e: any) => setNewFrostLoss({ ...newFrostLoss, loss_reason: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                    <option value="Freezer Burn">Freezer Burn</option>
                    <option value="Defrost Cycle Damage">Defrost Cycle Damage</option>
                    <option value="Packaging Seal Rupture">Packaging Seal Rupture</option>
                    <option value="Temperature Excursion">Temperature Excursion</option>
                    <option value="Transit Thaw">Transit Thaw</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Cold Bay / Location</label>
                    <input type="text" required value={newFrostLoss.warehouse_location} onChange={(e) => setNewFrostLoss({ ...newFrostLoss, warehouse_location: e.target.value })} placeholder="e.g. Mumbai Bay 4" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Estimated Loss (₹ INR)</label>
                    <input type="number" required value={newFrostLoss.estimated_loss_value} onChange={(e) => setNewFrostLoss({ ...newFrostLoss, estimated_loss_value: e.target.value as any })} placeholder="e.g. 18750" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowFrostLossModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">Log Incident</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Adjustment Modal */}
      <AnimatePresence>
        {showAdjustmentModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAdjustmentModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Cold Storage Stock Adjustment / Transfer</h3>
                <button onClick={() => setShowAdjustmentModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleRecordAdjustment} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Product Name</label>
                  <input type="text" required value={newAdjustment.product_name} onChange={(e) => setNewAdjustment({ ...newAdjustment, product_name: e.target.value })} placeholder="e.g. King Tiger Prawns (500g)" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Adjustment Type</label>
                    <select value={newAdjustment.adjustment_type} onChange={(e: any) => setNewAdjustment({ ...newAdjustment, adjustment_type: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="Inter-Warehouse Transfer">Inter-Warehouse Transfer</option>
                      <option value="Inward Addition">Inward Addition</option>
                      <option value="Frost Loss Deduction">Frost Loss Deduction</option>
                      <option value="Cycle Count Audit">Cycle Count Audit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Quantity</label>
                    <input type="number" required value={newAdjustment.quantity} onChange={(e) => setNewAdjustment({ ...newAdjustment, quantity: e.target.value as any })} placeholder="e.g. 50" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Source Location</label>
                    <input type="text" required value={newAdjustment.source_location} onChange={(e) => setNewAdjustment({ ...newAdjustment, source_location: e.target.value })} placeholder="e.g. Mumbai Deep Freeze" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Target Location</label>
                    <input type="text" value={newAdjustment.target_location} onChange={(e) => setNewAdjustment({ ...newAdjustment, target_location: e.target.value })} placeholder="e.g. Pune Regional Depot" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Reason / Notes</label>
                  <input type="text" required value={newAdjustment.reason} onChange={(e) => setNewAdjustment({ ...newAdjustment, reason: e.target.value })} placeholder="e.g. Rebalancing cold stocks for weekend surge" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAdjustmentModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">Execute Adjustment</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
