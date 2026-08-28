import React, { useState, useEffect } from 'react';
import { Warehouse, Search, Thermometer, MapPin } from 'lucide-react';
import { Card } from '../../components/Card';
import { getRimiWarehouses } from '../../lib/api/rimi';

export const RimiWarehouses: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await getRimiWarehouses();
      const mapped = data.map((d: any) => {
        const utilPct = d.total_capacity_pallets > 0 ? Math.round((d.utilized_pallets / d.total_capacity_pallets) * 100) : 75;
        return {
          id: d.code || d.id,
          name: d.name,
          city: d.city,
          temp: `${d.cold_room_temp_celsius || -22.0}°C`,
          capacity: `${Number(d.total_capacity_pallets || 1000).toLocaleString()} Pallets (${utilPct}% Used)`,
          manager: d.manager_name || 'Hub Manager',
          status: 'Active Frozen'
        };
      });
      setFacilities(mapped);
      setLoading(false);
    };
    load();
  }, []);

  const filteredFacilities = facilities.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left antialiased">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Warehouse className="w-5 h-5 text-[#6A1B2E]" /> Temperature Controlled Cold Hubs
        </h1>
        <p className="text-xs font-semibold text-slate-500 mt-1">
          Rimi Cold Chain Console • Live telemetry monitoring, deep freeze storage, and regional hub capacity.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading cold facilities...</div>
      ) : null}

      <Card className="p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search facility name or city..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredFacilities.length} Cold Facilities</span>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {filteredFacilities.map((w) => (
          <Card key={w.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase">{w.id}</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">{w.status}</span>
              </div>
              <h3 className="text-base font-black text-slate-900">{w.name}</h3>
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#6A1B2E]" /> {w.city}
              </p>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
                <span className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-blue-600" /> Temperature:
                </span>
                <span className="text-sm font-black text-blue-900">{w.temp}</span>
              </div>
              <p className="text-xs font-semibold text-slate-500">{w.capacity}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs font-bold text-slate-600">
              Facility Manager: {w.manager}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
