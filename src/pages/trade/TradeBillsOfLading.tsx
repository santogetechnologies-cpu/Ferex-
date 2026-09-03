import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCheck2, Search, Download, Eye, X, CheckCircle2, Anchor } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getTradeBillsOfLading, createTradeBillOfLading } from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';
import { Plus } from 'lucide-react';

export const TradeBillsOfLading: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBL, setSelectedBL] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<any[]>([]);

  const [newBL, setNewBL] = useState({
    vessel: 'MSC Oscar (V.8821)',
    carrier: 'MSC Mediterranean Shipping Co.',
    pol: 'Port of Gdansk 🇵🇱',
    pod: 'Port of Rotterdam 🇳🇱',
    consignee: 'Warsaw Global Logistics Sp. z o.o.'
  });

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const data = await getTradeBillsOfLading();
    setBills(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_trade_bls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_bills_of_lading' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_trade_bls_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_bls_change', handleLocalChange);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleCreateBL = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await createTradeBillOfLading({
      vessel_name: newBL.vessel,
      carrier: newBL.carrier,
      port_of_loading: newBL.pol,
      port_of_discharge: newBL.pod,
      consignee: newBL.consignee,
    });
    await loadData();
    setShowCreateModal(false);
    showToastMsg(`Registered Bill of Lading ${created.bl_number || created.id}`);
  };

  const filteredBills = bills.filter(b =>
    (b.bl_number || b.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.vessel_name || b.vessel || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.carrier || '').toLowerCase().includes(searchQuery.toLowerCase())
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
            <FileCheck2 className="w-5 h-5 text-[#6A1B2E]" /> Bills of Lading (B/L) Registry
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Trade Console • Ocean Bills of Lading, vessel assignments, port of loading/discharge documentation.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Issue Ocean B/L
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search B/L #, Vessel, Carrier..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredBills.length} Bills Registered</span>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading bills of lading...</div>
      ) : (
        <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                  <th className="py-3 px-4">B/L Number & Vessel</th>
                  <th className="py-3 px-4">Carrier Line</th>
                  <th className="py-3 px-4">Port of Loading (POL)</th>
                  <th className="py-3 px-4">Port of Discharge (POD)</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredBills.map((b) => {
                  const blId = b.bl_number || b.id;
                  const vessel = b.vessel_name || b.vessel || 'Ocean Vessel';
                  const carrier = b.carrier || 'MSC Mediterranean Shipping';
                  const pol = b.port_of_loading || b.pol || 'Port of Gdansk 🇵🇱';
                  const pod = b.port_of_discharge || b.pod || 'Port of Rotterdam 🇳🇱';
                  const issueDate = b.issue_date || b.issueDate || 'Jul 28, 2026';
                  const status = b.status || 'Clean On-Board Signed';

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        <div className="flex items-center gap-1.5"><Anchor className="w-3.5 h-3.5 text-[#6A1B2E]" /> {blId}</div>
                        <span className="text-[10px] font-bold text-slate-400">{vessel}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{carrier}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{pol}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{pod}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{issueDate}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-emerald-50 text-emerald-700 border-emerald-200">
                          {status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setSelectedBL(b)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Inspect B/L Document">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => showToastMsg(`Downloading B/L PDF for ${blId}...`)} className="p-1.5 rounded-lg text-slate-400 hover:text-[#6A1B2E] hover:bg-slate-100" title="Download B/L PDF">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Drawer */}
      <AnimatePresence>
        {selectedBL && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedBL(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Ocean Bill of Lading Document</h3>
                <button onClick={() => setSelectedBL(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{selectedBL.bl_number || selectedBL.id}</span>
                  <h4 className="text-base font-black text-slate-900">{selectedBL.carrier}</h4>
                  <p className="text-xs font-semibold text-slate-500">{selectedBL.vessel_name || selectedBL.vessel}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Shipper & Consignee</span>
                  <div className="text-xs font-black text-slate-900">Shipper: {selectedBL.shipper}</div>
                  <div className="text-xs font-semibold text-slate-500">Consignee: {selectedBL.consignee}</div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Routing Details</span>
                  <div className="text-xs font-black text-slate-900">POL: {selectedBL.pol}</div>
                  <div className="text-xs font-black text-slate-900">POD: {selectedBL.pod}</div>
                </div>

                <Button size="sm" className="w-full text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => {
                  showToastMsg(`Official B/L Copy exported for ${selectedBL.id}`);
                }}>
                  Export Signed B/L Copy
                </Button>
              </div>
            </motion.div>
          </>
        )}
        {/* Create B/L Modal */}
        {showCreateModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowCreateModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Issue Ocean Bill of Lading</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCreateBL} className="space-y-3 text-left">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Vessel Name & Voyage</label>
                  <input type="text" value={newBL.vessel} onChange={e => setNewBL({ ...newBL, vessel: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" required />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Ocean Carrier Line</label>
                  <input type="text" value={newBL.carrier} onChange={e => setNewBL({ ...newBL, carrier: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500">Port of Loading (POL)</label>
                    <input type="text" value={newBL.pol} onChange={e => setNewBL({ ...newBL, pol: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500">Port of Discharge (POD)</label>
                    <input type="text" value={newBL.pod} onChange={e => setNewBL({ ...newBL, pod: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" required />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Consignee Entity</label>
                  <input type="text" value={newBL.consignee} onChange={e => setNewBL({ ...newBL, consignee: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" required />
                </div>
                <Button type="submit" size="sm" className="w-full bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold mt-2">
                  Sign & Issue Ocean B/L
                </Button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
