import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PackageCheck, Search, Download, Eye, X, CheckCircle2, Plus, Trash2,
  FileSpreadsheet, Truck, Building2, Layers
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getTradePackingLists,
  createTradePackingList,
  deleteTradePackingList,
  getTradeShipments,
  getTradeInvoices,
  getTradeCRMContacts
} from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';

export const TradePackingLists: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedList, setSelectedList] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState('');
  const [lists, setLists] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [crmPartners, setCrmPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const initialPL = {
    shipment_no: '',
    invoice_no: '',
    buyer_name: '',
    cargo_description: '',
    package_type: 'Palletised Cargo Units',
    total_packages: '48',
    gross_weight: '24500',
    net_weight: '23800',
    dimensions: '40ft Standard High Cube Container',
    volume_cbm: '67.5',
    marks_numbers: '',
  };

  const [newPL, setNewPL] = useState(initialPL);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [data, shipData, invData, partners] = await Promise.all([
        getTradePackingLists(),
        getTradeShipments().catch(() => []),
        getTradeInvoices().catch(() => []),
        getTradeCRMContacts().catch(() => [])
      ]);

      if (Array.isArray(shipData)) setShipments(shipData);
      if (Array.isArray(invData)) setInvoices(invData);
      if (Array.isArray(partners)) setCrmPartners(partners);

      if (Array.isArray(data)) {
        const formatted = data.map((d: any) => ({
          id: d.pl_number || d.id,
          rawId: d.id,
          shipment_no: d.shipment_no || 'SHP-9821',
          invoice_no: d.invoice_no || '',
          items: `${d.total_packages || 48} Pkgs · ${d.cargo_description || 'Trade Cargo'}`,
          cargo_description: d.cargo_description || 'General Cargo',
          package_type: d.package_type || 'Standard Pallets',
          total_packages: d.total_packages || 48,
          grossWeight: `${Number(d.gross_weight_kg || 24500).toLocaleString()} kg`,
          rawGrossWeight: Number(d.gross_weight_kg || 24500),
          netWeight: `${Number(d.net_weight_kg || 22800).toLocaleString()} kg`,
          rawNetWeight: Number(d.net_weight_kg || 22800),
          dimensions: d.dimensions || '40ft Standard High Cube Container',
          volume_cbm: d.volume_cbm || 65.0,
          marks_numbers: d.marks_numbers || `FEREX/${d.shipment_no || 'EXP'}/2026`,
          consignee: d.buyer_name || 'Trade Partner Consignee',
          status: d.container_status || 'Loaded & Sealed (Customs Inspected)',
          statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }));
        setLists(formatted);
      } else {
        setLists([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_trade_pls_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_packing_lists' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_trade_pls_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_pls_change', handleLocalChange);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleCreatePL = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPL.shipment_no || !newPL.cargo_description) return;

    const created = await createTradePackingList({
      shipment_no: newPL.shipment_no,
      invoice_no: newPL.invoice_no,
      buyer_name: newPL.buyer_name || 'Trade Partner Consignee',
      cargo_description: newPL.cargo_description,
      package_type: newPL.package_type,
      total_packages: Number(newPL.total_packages) || 1,
      gross_weight_kg: Number(newPL.gross_weight) || 0,
      net_weight_kg: Number(newPL.net_weight) || 0,
      dimensions: newPL.dimensions,
      volume_cbm: Number(newPL.volume_cbm) || 60,
      marks_numbers: newPL.marks_numbers,
    });

    setNewPL(initialPL);
    setShowCreateModal(false);
    showToastMsg(`Created Packing Manifest ${created.pl_number || created.id}`);
    await loadData();
  };

  const handleDeletePL = async (id: string, rawId?: string) => {
    if (!window.confirm(`Delete Packing List ${id}?`)) return;
    setLists(prev => prev.filter(l => l.id !== id && l.rawId !== rawId));
    showToastMsg(`Removed Packing List ${id}`);
    await deleteTradePackingList(rawId || id);
    await loadData();
  };

  const downloadPLManifestCSV = (pl: any) => {
    const rows = [
      ['FEREX GLOBAL TRADE PACKING LIST MANIFEST'],
      ['Packing List Ref', pl.id],
      ['Shipment Reference', pl.shipment_no],
      ['Commercial Invoice Ref', pl.invoice_no || 'N/A'],
      ['Consignee / Buyer', pl.consignee],
      ['Cargo Description', pl.cargo_description],
      ['Package Type', pl.package_type],
      ['Total Packages', pl.total_packages],
      ['Gross Weight', pl.grossWeight],
      ['Net Weight', pl.netWeight],
      ['Dimensions', pl.dimensions],
      ['Volume', `${pl.volume_cbm} CBM`],
      ['Marks & Numbers', pl.marks_numbers],
      ['Status', pl.status],
    ];
    const csvContent = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${pl.id}_Packing_Manifest.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Auto-fill cargo and buyer when shipment is selected
  const handleShipmentSelect = (shpId: string) => {
    const shp = shipments.find(s => s.id === shpId || s.shipment_no === shpId);
    if (shp) {
      setNewPL(prev => ({
        ...prev,
        shipment_no: shp.shipment_no || shp.id,
        buyer_name: shp.partner_name || prev.buyer_name,
        cargo_description: shp.cargo_description || shp.cargo || prev.cargo_description,
        gross_weight: String(shp.cargo_weight_kg || prev.gross_weight),
        net_weight: String(Math.round((shp.cargo_weight_kg || 24000) * 0.95)),
      }));
    } else {
      setNewPL(prev => ({ ...prev, shipment_no: shpId }));
    }
  };

  const filteredLists = lists.filter((l) => {
    const matchesSearch =
      l.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.shipment_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.consignee.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.items.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 text-xs font-bold"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-[#58051E]" />
            Packing Lists & Manifests
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Export cargo packing declarations linked to ocean containers, weights, dimensions, and commercial invoices.
          </p>
        </div>
        <Button
          size="sm"
          className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-xs cursor-pointer"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Generate Packing List
        </Button>
      </div>

      {/* Search */}
      <Card className="p-3 border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by PL #, shipment, consignee, or cargo..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
          />
        </div>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400">Loading packing manifests...</div>
      ) : filteredLists.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <PackageCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No packing lists found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery ? 'No manifests match your filter.' : 'Generate a container packing manifest against a booked shipment.'}
          </p>
          <Button
            size="sm"
            className="mt-4 bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold cursor-pointer"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Generate Packing List
          </Button>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden border border-slate-200/80 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Packing List #</th>
                  <th className="py-3 px-4">Shipment #</th>
                  <th className="py-3 px-4">Consignee / Buyer</th>
                  <th className="py-3 px-4">Cargo & Packages</th>
                  <th className="py-3 px-4">Gross Weight</th>
                  <th className="py-3 px-4">Net Weight</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredLists.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-black text-[#58051E] whitespace-nowrap">
                      {l.id}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-800 font-mono text-[11px]">
                      {l.shipment_no}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900 max-w-[170px] truncate" title={l.consignee}>
                      {l.consignee}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-[200px] truncate" title={l.items}>
                      {l.items}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-900">
                      {l.grossWeight}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-600">
                      {l.netWeight}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${l.statusBadge}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedList(l)}
                          className="p-1.5 text-slate-400 hover:text-[#58051E] hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="View Manifest Dossier"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadPLManifestCSV(l)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="Export CSV Manifest"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePL(l.id, l.rawId)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                          title="Delete Manifest"
                        >
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

      {/* ── MODAL 1: GENERATE PACKING LIST ── */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowCreateModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-[#58051E]" /> Generate Packing List Manifest
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreatePL} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Select Shipment *</label>
                    <select
                      required
                      value={newPL.shipment_no}
                      onChange={(e) => handleShipmentSelect(e.target.value)}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="">Select Booked Shipment...</option>
                      {shipments.map(s => <option key={s.id} value={s.id}>{s.id} ({s.cargo})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Linked Invoice</label>
                    <select
                      value={newPL.invoice_no}
                      onChange={(e) => setNewPL({ ...newPL, invoice_no: e.target.value })}
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="">Select Invoice (Optional)...</option>
                      {invoices.map(i => <option key={i.id} value={i.id}>{i.id} ({i.buyer_name || i.buyer})</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Buyer / Consignee Entity</label>
                  <input
                    type="text"
                    required
                    value={newPL.buyer_name}
                    onChange={(e) => setNewPL({ ...newPL, buyer_name: e.target.value })}
                    placeholder="e.g. Baltic Grain Sp. z o.o."
                    className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Cargo Commodity Description *</label>
                  <input
                    type="text"
                    required
                    value={newPL.cargo_description}
                    onChange={(e) => setNewPL({ ...newPL, cargo_description: e.target.value })}
                    placeholder="e.g. Agricultural Milling Wheat Grade-A"
                    className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Package Type</label>
                    <input
                      type="text"
                      value={newPL.package_type}
                      onChange={(e) => setNewPL({ ...newPL, package_type: e.target.value })}
                      placeholder="e.g. Palletised Flexitanks, Wooden Crates"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Total Packages Count</label>
                    <input
                      type="number"
                      value={newPL.total_packages}
                      onChange={(e) => setNewPL({ ...newPL, total_packages: e.target.value })}
                      placeholder="48"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Gross Weight (KG)</label>
                    <input
                      type="number"
                      required
                      value={newPL.gross_weight}
                      onChange={(e) => setNewPL({ ...newPL, gross_weight: e.target.value })}
                      placeholder="24500"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Net Weight (KG)</label>
                    <input
                      type="number"
                      required
                      value={newPL.net_weight}
                      onChange={(e) => setNewPL({ ...newPL, net_weight: e.target.value })}
                      placeholder="23800"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Dimensions / Container Specs</label>
                    <input
                      type="text"
                      value={newPL.dimensions}
                      onChange={(e) => setNewPL({ ...newPL, dimensions: e.target.value })}
                      placeholder="40ft High Cube ISO Container"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Total Volume (CBM)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newPL.volume_cbm}
                      onChange={(e) => setNewPL({ ...newPL, volume_cbm: e.target.value })}
                      placeholder="67.5"
                      className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] text-white">Generate Manifest</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: PACKING LIST DOSSIER ── */}
      <AnimatePresence>
        {selectedList && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={() => setSelectedList(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto text-left">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#58051E] bg-[#58051E]/10 px-2 py-0.5 rounded">
                    {selectedList.id}
                  </span>
                  <h2 className="text-lg font-black text-slate-900 mt-1">Packing Manifest Dossier</h2>
                  <p className="text-xs text-slate-500">Shipment Link: {selectedList.shipment_no}</p>
                </div>
                <button onClick={() => setSelectedList(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>

              <div className="py-4 space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-slate-500">Consignee: <strong className="text-slate-900">{selectedList.consignee}</strong></div>
                  <div className="text-slate-500 mt-1">Cargo Description: <strong className="text-slate-900">{selectedList.cargo_description}</strong></div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Gross Weight</span>
                    <span className="font-extrabold text-slate-900">{selectedList.grossWeight}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Net Weight</span>
                    <span className="font-extrabold text-slate-900">{selectedList.netWeight}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Packages</span>
                    <span className="font-extrabold text-slate-900">{selectedList.total_packages} Units</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Volume</span>
                    <span className="font-extrabold text-slate-900">{selectedList.volume_cbm} CBM</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Marks & Numbers</span>
                  <span className="font-mono text-slate-800 font-bold">{selectedList.marks_numbers}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between">
                <button
                  onClick={() => downloadPLManifestCSV(selectedList)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export Manifest
                </button>
                <Button size="sm" variant="outline" onClick={() => setSelectedList(null)}>Close</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};
