import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCheck2, Search, Download, Eye, X, CheckCircle2, Anchor } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const TradeBillsOfLading: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBL, setSelectedBL] = useState<any>(null);
  const [toast, setToast] = useState('');

  const [bills] = useState([
    {
      id: 'BL-992014',
      vessel: 'MSC Oscar (V.8821)',
      carrier: 'MSC Mediterranean Shipping Co.',
      pol: 'Port of Gdansk 🇵🇱',
      pod: 'Port of Rotterdam 🇳🇱',
      shipper: 'Ferex Global Trade Corp',
      consignee: 'Warsaw Global Logistics Sp. z o.o.',
      issueDate: 'Jul 28, 2026',
      status: 'Clean On-Board Signed',
      statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      id: 'BL-992015',
      vessel: 'Maersk Mc-Kinney (V.4410)',
      carrier: 'Maersk Line',
      pol: 'Port of Hamburg 🇩🇪',
      pod: 'Port of Singapore 🇸🇬',
      shipper: 'Berlin Industrial Supplies GmbH',
      consignee: 'Singapore Marine Hub Pte',
      issueDate: 'Aug 02, 2026',
      status: 'Original Issued',
      statusBadge: 'bg-blue-50 text-blue-700 border-blue-200'
    }
  ]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const filteredBills = bills.filter(b =>
    b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.vessel.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.carrier.toLowerCase().includes(searchQuery.toLowerCase())
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
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search B/L #, Vessel, Carrier..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredBills.length} Bills Registered</span>
      </Card>

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
              {filteredBills.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-extrabold text-slate-900">
                    <div className="flex items-center gap-1.5"><Anchor className="w-3.5 h-3.5 text-[#6A1B2E]" /> {b.id}</div>
                    <span className="text-[10px] font-bold text-slate-400">{b.vessel}</span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{b.carrier}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{b.pol}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{b.pod}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{b.issueDate}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${b.statusBadge}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setSelectedBL(b)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Inspect B/L Document">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => showToastMsg(`Downloading B/L PDF for ${b.id}...`)} className="p-1.5 rounded-lg text-slate-400 hover:text-[#6A1B2E] hover:bg-slate-100" title="Download B/L PDF">
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
                  <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{selectedBL.id}</span>
                  <h4 className="text-base font-black text-slate-900">{selectedBL.carrier}</h4>
                  <p className="text-xs font-semibold text-slate-500">{selectedBL.vessel}</p>
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
      </AnimatePresence>
    </div>
  );
};
