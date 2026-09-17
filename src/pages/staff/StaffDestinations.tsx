import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Search, CheckCircle2, AlertCircle, RotateCcw,
  Clock, DollarSign, ShieldCheck, MapPin, Building2, ChevronRight,
  X, Info
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getDestinations, type DestinationItem } from '../../lib/api/destinations';

export const StaffDestinations: React.FC = () => {
  const [destinations, setDestinations] = useState<DestinationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDest, setSelectedDest] = useState<DestinationItem | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDestinations();
      setDestinations(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load destinations from database');
      setDestinations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('ferex_destinations_change', loadData);
    return () => {
      window.removeEventListener('ferex_destinations_change', loadData);
    };
  }, []);

  const filteredDestinations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return destinations;
    return destinations.filter(d => {
      return (
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        (d.authority || '').toLowerCase().includes(q) ||
        (d.currency || '').toLowerCase().includes(q) ||
        (d.desk || '').toLowerCase().includes(q)
      );
    });
  }, [destinations, searchQuery]);

  return (
    <div className="space-y-6 text-left antialiased select-none font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-[#58051E] bg-[#58051E]/10 px-2.5 py-0.5 rounded-md border border-[#58051E]/20 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#58051E]" /> EDUCATION DESTINATIONS DESK
            </span>
            <span className="text-[10px] font-bold text-slate-400">● Live Supabase Master</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <Globe className="w-6 h-6 text-[#58051E]" /> Study Destinations & Visa Catalog
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Key study destinations, immigration authorities, visa fees, standard processing turnaround, and counselor guidelines.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-[#58051E]' : ''}`} />
            Refresh Destinations
          </Button>
        </div>
      </div>

      {/* Search Toolbar */}
      <Card className="p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search destinations by country, code, authority..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#58051E]"
            />
          </div>
          <span className="text-xs font-bold text-slate-500">
            {filteredDestinations.length} Destination{filteredDestinations.length === 1 ? '' : 's'}
          </span>
        </div>
      </Card>

      {/* Real DB Error Alert */}
      {error && (
        <Card className="p-6 border border-red-200 bg-red-50/40 shadow-xs text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-red-900">Database Connection Notice</h3>
            <p className="text-xs font-semibold text-red-700 mt-1 max-w-md mx-auto leading-relaxed">
              {error}
            </p>
          </div>
          <Button
            size="sm"
            onClick={loadData}
            className="bg-[#58051E] text-white hover:bg-[#430316] font-bold text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Retry Connection
          </Button>
        </Card>
      )}

      {/* Loading Skeleton */}
      {loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-5 border border-slate-200/80 shadow-xs animate-pulse space-y-3">
              <div className="h-5 bg-slate-200 rounded w-2/3" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </Card>
          ))}
        </div>
      )}

      {/* Empty State — Strictly no mock data */}
      {!loading && !error && filteredDestinations.length === 0 && (
        <Card className="p-12 border border-slate-200/80 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">No destinations found</h3>
            <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              {destinations.length === 0
                ? 'No study destinations are currently stored in the database. When added by administrators, destinations will appear here.'
                : 'No destinations match your search query.'}
            </p>
          </div>
        </Card>
      )}

      {/* Real Destinations Grid */}
      {!loading && !error && filteredDestinations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDestinations.map(dest => (
            <Card
              key={dest.id}
              className="p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3.5 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl select-none">{dest.flag || '🌍'}</span>
                    <div>
                      <h3 className="text-base font-black text-slate-900 leading-tight">
                        {dest.name}
                      </h3>
                      <span className="text-[10px] font-bold text-slate-400">
                        Code: {dest.code} • {dest.currency || 'USD'}
                      </span>
                    </div>
                  </div>

                  {dest.badge && (
                    <span className="text-[9.5px] font-black text-[#58051E] bg-[#58051E]/10 px-2 py-0.5 rounded border border-[#58051E]/20">
                      {dest.badge}
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-semibold">Authority:</span>
                    <span className="font-bold text-slate-800">{dest.authority || dest.acronym || 'Immigration Desk'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-semibold">Processing Time:</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {dest.processing || '3-6 weeks'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-semibold">Visa Fee:</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-slate-400" />
                      {dest.fee || 'Varies'}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedDest(dest)}
                className="w-full text-xs font-bold text-[#58051E] border-[#58051E]/30 hover:bg-[#58051E]/5 mt-2"
              >
                <Info className="w-3.5 h-3.5 mr-1.5" />
                Counselor Advisory Notes
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Destination Advisory Modal */}
      <AnimatePresence>
        {selectedDest && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900 z-50"
              onClick={() => setSelectedDest(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl">{selectedDest.flag || '🌍'}</span>
                  <div>
                    <h3 className="text-base font-black text-slate-900">{selectedDest.name}</h3>
                    <span className="text-[11px] font-semibold text-slate-400">
                      ISO Code: {selectedDest.code} • Currency: {selectedDest.currency}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDest(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Immigration Authority:</span>
                    <strong className="text-slate-900">{selectedDest.authority}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Official Acronym:</span>
                    <strong className="text-slate-900">{selectedDest.acronym}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Standard Processing:</span>
                    <strong className="text-slate-900">{selectedDest.processing}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Government Application Fee:</span>
                    <strong className="text-slate-900">{selectedDest.fee}</strong>
                  </div>
                  {selectedDest.desk && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">Assigned Advisory Desk:</span>
                      <strong className="text-slate-900">{selectedDest.desk}</strong>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/70 text-[11px] text-amber-900 font-semibold leading-relaxed">
                  <strong className="block mb-1 font-black">Admissions Counselor Guidance:</strong>
                  Ensure student candidates prepare bank solvency statements, academic transcripts, and official language test results aligned with {selectedDest.authority} compliance before submitting university dossiers.
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedDest(null)}
                  className="text-xs font-bold"
                >
                  Close Guidance
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
