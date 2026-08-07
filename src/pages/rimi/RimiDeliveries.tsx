import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Search, CheckCircle2, Printer } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const RimiDeliveries: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');

  const [deliveries, setDeliveries] = useState([
    { id: 'DEL-2026-901', order: 'SO-2026-901', customer: 'Reliance Fresh Cold Hub', reeferTruck: 'Reefer MH-12-AZ-8901 (-20°C)', driver: 'Sanjay Kumar', status: 'In Transit', statusBadge: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'DEL-2026-902', order: 'SO-2026-902', customer: 'Taj Hotels Procurement', reeferTruck: 'Reefer KA-01-F-4412 (-18°C)', driver: 'M. Sunderam', status: 'Delivered', statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  ]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleMarkCompleted = (id: string) => {
    setDeliveries(deliveries.map(d => d.id === id ? { ...d, status: 'Delivered', statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200' } : d));
    showToastMsg(`Delivery ${id} marked completed! Temperature log archived.`);
  };

  const filteredDeliveries = deliveries.filter(d =>
    d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.customer.toLowerCase().includes(searchQuery.toLowerCase())
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
            <Truck className="w-5 h-5 text-[#6A1B2E]" /> Reefer Truck Deliveries & Cold Chain Pod
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Rimi Cold Chain Console • Live temperature-controlled delivery logs, driver assignments, and delivery notes.
          </p>
        </div>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search Delivery #, customer, driver..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredDeliveries.length} Deliveries Logged</span>
      </Card>

      <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                <th className="py-3 px-4">Delivery ID & Order</th>
                <th className="py-3 px-4">Customer Store Hub</th>
                <th className="py-3 px-4">Reefer Truck Unit</th>
                <th className="py-3 px-4">Driver Executive</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredDeliveries.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-extrabold text-slate-900">
                    <div>{d.id}</div>
                    <span className="text-[10px] font-bold text-[#6A1B2E]">{d.order}</span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{d.customer}</td>
                  <td className="py-3.5 px-4 font-bold text-blue-600">{d.reeferTruck}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{d.driver}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${d.statusBadge}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => showToastMsg(`Printing Delivery Note for ${d.id}...`)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Print Delivery Note">
                        <Printer className="w-4 h-4" />
                      </button>
                      {d.status !== 'Delivered' && (
                        <Button size="sm" className="h-7 text-[10px] font-extrabold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => handleMarkCompleted(d.id)}>
                          Mark Completed
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
