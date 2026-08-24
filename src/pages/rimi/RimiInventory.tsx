import React, { useState } from 'react';
import { Boxes, Search } from 'lucide-react';
import { Card } from '../../components/Card';

export const RimiInventory: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const [stockItems] = useState([
    { id: 'STK-801', product: 'Gourmet Crispy Chicken Nuggets (1kg)', warehouse: 'Mumbai Central Hub (-22°C)', quantity: '450 Packs', reorderPoint: '100 Packs', status: 'Optimal Stock' },
    { id: 'STK-802', product: 'Norwegian Salmon Fillets (500g)', warehouse: 'Delhi NCR Logistics (-20°C)', quantity: '180 Packs', reorderPoint: '50 Packs', status: 'Optimal Stock' },
    { id: 'STK-803', product: 'French Vanilla Ice Cream Tub (2L)', warehouse: 'Bengaluru Reefer Hub (-18°C)', quantity: '85 Tubs', reorderPoint: '100 Tubs', status: 'Reorder Warning' }
  ]);

  const filteredStock = stockItems.filter(s =>
    s.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.warehouse.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left antialiased">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-5 h-5 text-[#6A1B2E]" /> Cold Storage Inventory Control
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Rimi Cold Chain Console • Live warehouse balances, reorder points, and cold storage locations.
          </p>
        </div>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search product or cold warehouse..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredStock.length} Active Stock Lines</span>
      </Card>

      <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                <th className="py-3 px-4">Product SKU Description</th>
                <th className="py-3 px-4">Cold Warehouse Facility</th>
                <th className="py-3 px-4">Available Quantity</th>
                <th className="py-3 px-4">Reorder Threshold</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredStock.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-extrabold text-slate-900">
                    <div>{s.product}</div>
                    <span className="text-[10px] font-bold text-slate-400">{s.id}</span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{s.warehouse}</td>
                  <td className="py-3.5 px-4 font-black text-slate-900">{s.quantity}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{s.reorderPoint}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                      s.status === 'Optimal Stock' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {s.status}
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
