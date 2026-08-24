import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PackageCheck, Search, Download, Eye, X, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/Card';

export const TradePackingLists: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedList, setSelectedList] = useState<any>(null);
  const [toast, setToast] = useState('');

  const [lists] = useState([
    {
      id: 'PKL-8801',
      container: 'MSKU-9821045',
      items: '240 Wooden Crates · Automotive Gaskets',
      grossWeight: '24,500 kg',
      netWeight: '22,100 kg',
      consignee: 'Warsaw Global Logistics Sp. z o.o.',
      status: 'Customs Cleared',
      statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      id: 'PKL-8802',
      container: 'HLCU-4410982',
      items: '120 Steel Pallets · Precision Turbines',
      grossWeight: '18,200 kg',
      netWeight: '16,800 kg',
      consignee: 'Berlin Industrial Supplies GmbH',
      status: 'Under Port Inspection',
      statusBadge: 'bg-amber-50 text-amber-700 border-amber-200'
    }
  ]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
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
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
