import React, { useState } from 'react';
import { Navigation, Search, MapPin } from 'lucide-react';
import { Card } from '../../components/Card';

export const RimiDeliveryRoutes: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const [routes] = useState([
    { id: 'RTE-101', name: 'Western Express Cold Corridor', stops: 'Bhiwandi Hub -> Bandra -> Andheri -> Borivali', vehicle: 'Reefer MH-12-AZ-8901', eta: '45 mins to next drop', status: 'Active Dispatch' },
    { id: 'RTE-102', name: 'Delhi NCR Supermarket Circuit', String: 'Gurugram Facility -> Saket -> Dwarka -> Noida', vehicle: 'Reefer DL-03-CB-9920', eta: 'In Transit', status: 'Active Dispatch' }
  ]);

  const filteredRoutes = routes.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left antialiased">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Navigation className="w-5 h-5 text-[#6A1B2E]" /> Cold Chain Distribution Routes
        </h1>
        <p className="text-xs font-semibold text-slate-500 mt-1">
          Rimi Cold Chain Console • Multi-stop drop circuits, reefer truck route optimization, and delivery timing.
        </p>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search route name or ID..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredRoutes.length} Routes Active</span>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredRoutes.map((r) => (
          <Card key={r.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{r.id}</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">{r.status}</span>
            </div>
            <h3 className="text-base font-black text-slate-900">{r.name}</h3>
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Multi-Stop Drop Sequence</span>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#6A1B2E] shrink-0" /> {r.stops || r.String}
              </div>
            </div>
            <div className="text-xs font-bold text-slate-600">Assigned Reefer: {r.vehicle}</div>
          </Card>
        ))}
      </div>
    </div>
  );
};
