import React, { useState, useEffect } from 'react';
import { QrCode, Search } from 'lucide-react';
import { Card } from '../../components/Card';
import { getRimiBatches } from '../../lib/api/rimi';

export const RimiBatchTracking: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await getRimiBatches();
      const mapped = data.map((b: any) => ({
        id: b.batch_number,
        product: b.product_name,
        mfgDate: b.production_date,
        expDate: b.expiry_date,
        units: `${b.quantity_units} Units`,
        supplier: b.warehouse_name || 'Central Cold Hub',
        status: b.status || 'Active'
      }));
      setBatches(mapped);
      setLoading(false);
    };
    load();
  }, []);

  const filteredBatches = batches.filter(b =>
    b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.product.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left antialiased">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <QrCode className="w-5 h-5 text-[#6A1B2E]" /> Lot & Batch Telemetry Tracker
        </h1>
        <p className="text-xs font-semibold text-slate-500 mt-1">
          Rimi Cold Chain Console • Full origin traceability, supplier lot numbers, and manufacturing batch logs.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading batch records...</div>
      ) : null}

      <Card className="p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search Batch Lot # or product..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredBatches.length} Batches Registered</span>
      </Card>

      <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                <th className="py-3 px-4">Batch Lot ID & Product</th>
                <th className="py-3 px-4">Supplier Processing Plant</th>
                <th className="py-3 px-4">Mfg Date</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Batch Quantity</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredBatches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-extrabold text-slate-900">
                    <div>{b.product}</div>
                    <span className="text-[10px] font-bold text-[#6A1B2E]">{b.id}</span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{b.supplier}</td>
                  <td className="py-3.5 px-4 text-slate-600">{b.mfgDate}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{b.expDate}</td>
                  <td className="py-3.5 px-4 font-black text-slate-900">{b.units}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                      b.status.includes('Near Expiry') ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {b.status}
                    </span>
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
