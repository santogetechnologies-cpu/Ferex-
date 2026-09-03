import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PackageCheck, Search, Download, Eye, X, CheckCircle2, Plus } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getTradePackingLists, createTradePackingList } from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';

export const TradePackingLists: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedList, setSelectedList] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState('');
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newPL, setNewPL] = useState({
    shipment_no: 'SHP-9821',
    buyer_name: 'Berlin Industrial Supplies GmbH',
    cargo_description: 'Industrial Bearing Assemblies',
    packages: 48,
    gross_weight: 24500,
    net_weight: 22800,
  });

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const data = await getTradePackingLists();
    const formatted = data.map((d: any) => ({
      id: d.pl_number || d.id,
      container: d.shipment_no || 'SHP-9821',
      items: `${d.total_packages || 48} Crates · ${d.cargo_description || 'Cargo'}`,
      grossWeight: `${Number(d.gross_weight_kg || 24500).toLocaleString()} kg`,
      netWeight: `${Number(d.net_weight_kg || 22800).toLocaleString()} kg`,
      consignee: d.buyer_name || 'Warsaw Global Logistics Sp. z o.o.',
      status: d.container_status || 'Loaded & Sealed (Customs Inspected)',
      statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }));
    setLists(formatted);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_trade_pls')
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
    const created = await createTradePackingList({
      shipment_no: newPL.shipment_no,
      buyer_name: newPL.buyer_name,
      cargo_description: newPL.cargo_description,
      total_packages: Number(newPL.packages) || 48,
      gross_weight_kg: Number(newPL.gross_weight) || 24500,
      net_weight_kg: Number(newPL.net_weight) || 22800,
    });
    await loadData();
    setShowCreateModal(false);
    showToastMsg(`Created Packing Manifest ${created.pl_number || created.id}`);
  };

  const filteredLists = lists.filter(l =>
    l.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.container.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.consignee.toLowerCase().includes(searchQuery.toLowerCase())
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
            <PackageCheck className="w-5 h-5 text-[#6A1B2E]" /> Cargo Packing Lists & Manifests
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Trade Console • Container package breakdowns, net/gross weight verifications, and port manifests.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Generate Packing List
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search Container #, Packing ID..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredLists.length} Manifests Listed</span>
      </Card>

      <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                <th className="py-3 px-4">Packing ID & Container</th>
                <th className="py-3 px-4">Cargo & Packages</th>
                <th className="py-3 px-4">Gross / Net Weight</th>
                <th className="py-3 px-4">Consignee</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredLists.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-extrabold text-slate-900">
                    <div>{l.container}</div>
                    <span className="text-[10px] font-bold text-slate-400">{l.id}</span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{l.items}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{l.grossWeight} / {l.netWeight}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{l.consignee}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${l.statusBadge}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setSelectedList(l)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Inspect Packing Details">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => showToastMsg(`Exporting Packing Manifest ${l.id}...`)} className="p-1.5 rounded-lg text-slate-400 hover:text-[#6A1B2E] hover:bg-slate-100" title="Export Manifest">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Drawer */}
      <AnimatePresence>
        {selectedList && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedList(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Packing List & Manifest Inspector</h3>
                <button onClick={() => setSelectedList(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{selectedList.id}</span>
                  <h4 className="text-base font-black text-slate-900">{selectedList.container}</h4>
                  <p className="text-xs font-semibold text-slate-500">{selectedList.items}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Gross Weight / Net Weight</span>
                  <div className="text-sm font-black text-slate-900">{selectedList.grossWeight} / {selectedList.netWeight}</div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Consignee Party</span>
                  <div className="text-xs font-black text-slate-900">{selectedList.consignee}</div>
                </div>

                <Button size="sm" className="w-full text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => {
                  showToastMsg(`Packing List ${selectedList.id} PDF downloaded`);
                }}>
                  Download Official Packing List
                </Button>
              </div>
            </motion.div>
          </>
        )}

        {/* Generate Packing List Modal */}
        {showCreateModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowCreateModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Generate Cargo Packing List</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCreatePL} className="space-y-3 text-left">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Shipment Number</label>
                  <input type="text" value={newPL.shipment_no} onChange={e => setNewPL({ ...newPL, shipment_no: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" required />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Buyer Entity / Consignee</label>
                  <input type="text" value={newPL.buyer_name} onChange={e => setNewPL({ ...newPL, buyer_name: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" required />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Cargo Description</label>
                  <input type="text" value={newPL.cargo_description} onChange={e => setNewPL({ ...newPL, cargo_description: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" required />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500">Packages</label>
                    <input type="number" value={newPL.packages} onChange={e => setNewPL({ ...newPL, packages: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500">Gross Wt (kg)</label>
                    <input type="number" value={newPL.gross_weight} onChange={e => setNewPL({ ...newPL, gross_weight: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500">Net Wt (kg)</label>
                    <input type="number" value={newPL.net_weight} onChange={e => setNewPL({ ...newPL, net_weight: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" required />
                  </div>
                </div>
                <Button type="submit" size="sm" className="w-full bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold mt-2">
                  Generate & Save Manifest
                </Button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
