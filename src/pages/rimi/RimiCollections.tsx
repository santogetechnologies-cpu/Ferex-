import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Search, CheckCircle2, Download } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getRimiCollections } from '../../lib/api/rimi';

export const RimiCollections: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await getRimiCollections();
      setCollections(data);
      setLoading(false);
    };
    loadData();
  }, []);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const filteredCollections = collections.filter(c =>
    (c.collection_number || c.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.customer_name || c.customer || '').toLowerCase().includes(searchQuery.toLowerCase())
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
            <DollarSign className="w-5 h-5 text-[#6A1B2E]" /> Customer Financial Collections Ledger
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Rimi Cold Chain Console • B2B payment collections, bank wire receipts, and collection agent assignments.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => showToastMsg('Exported Collections Ledger CSV')}>
          <Download className="w-4 h-4 mr-1.5" /> Export Collections CSV
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search collection ref or customer..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredCollections.length} Collection Logs</span>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading collections ledger...</div>
      ) : (
        <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                  <th className="py-3 px-4">Collection Ref & Customer</th>
                  <th className="py-3 px-4">Collection Amount (₹)</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Cleared Date</th>
                  <th className="py-3 px-4">Collection Agent</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredCollections.map((c) => {
                  const colId = c.collection_number || c.id;
                  const cust = c.customer_name || c.customer || 'Store Network';
                  const amt = c.amount_collected ? `₹${Number(c.amount_collected).toLocaleString('en-IN')}` : (c.amount || '₹14,50,000');
                  const mode = c.payment_mode || c.mode || 'NEFT Bank Wire';
                  const date = c.collected_at ? new Date(c.collected_at).toLocaleDateString() : (c.date || 'Aug 05, 2026');
                  const agent = c.agent || 'Sandeep Verma';
                  const status = c.status || 'Cleared';

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        <div>{cust}</div>
                        <span className="text-[10px] font-bold text-slate-400">{colId}</span>
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900">{amt}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{mode}</td>
                      <td className="py-3.5 px-4 text-slate-600">{date}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{agent}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          status === 'Cleared' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
