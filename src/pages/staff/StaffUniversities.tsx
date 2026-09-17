import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Search, CheckCircle2, AlertCircle, RotateCcw,
  MapPin, Globe, GraduationCap, DollarSign, Calendar, Star,
  ChevronRight, X, ShieldCheck, BookOpen
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getUniversities } from '../../lib/api/universities';
import type { University } from '../../lib/types';

export const StaffUniversities: React.FC = () => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const [selectedUni, setSelectedUni] = useState<University | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUniversities();
      setUniversities(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load universities from database');
      setUniversities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('ferex_universities_change', loadData);
    return () => {
      window.removeEventListener('ferex_universities_change', loadData);
    };
  }, []);

  // Country filters
  const countries = useMemo(() => {
    const set = new Set<string>();
    universities.forEach(u => {
      if (u.country) set.add(u.country.trim());
    });
    return ['All', ...Array.from(set).sort()];
  }, [universities]);

  const filteredUnis = useMemo(() => {
    return universities.filter(u => {
      const matchesCountry =
        selectedCountry === 'All' ||
        (u.country || '').toLowerCase() === selectedCountry.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        (u.city || '').toLowerCase().includes(q) ||
        (u.country || '').toLowerCase().includes(q) ||
        (u.programs || []).some(p => p.toLowerCase().includes(q));

      return matchesCountry && matchesSearch;
    });
  }, [universities, selectedCountry, searchQuery]);

  return (
    <div className="space-y-6 text-left antialiased select-none font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-[#58051E] bg-[#58051E]/10 px-2.5 py-0.5 rounded-md border border-[#58051E]/20 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#58051E]" /> PARTNER DIRECTORY
            </span>
            <span className="text-[10px] font-bold text-slate-400">● Live Supabase University Master</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#58051E]" /> University Catalog & Programs
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Explore partner institutions, academic requirements, tuition fee structures, and degree intakes for student counseling.
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
            Refresh Catalog
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <Card className="p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Country Filter */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {countries.map(country => (
              <button
                key={country}
                onClick={() => setSelectedCountry(country)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCountry === country
                    ? 'bg-[#58051E] text-white shadow-xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {country}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search universities, courses..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#58051E]"
            />
          </div>
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
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="p-5 border border-slate-200/80 shadow-xs animate-pulse space-y-3">
              <div className="h-5 bg-slate-200 rounded w-2/3" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
              <div className="h-8 bg-slate-100 rounded" />
            </Card>
          ))}
        </div>
      )}

      {/* Empty State — Strictly no mock data */}
      {!loading && !error && filteredUnis.length === 0 && (
        <Card className="p-12 border border-slate-200/80 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">No universities found</h3>
            <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              {universities.length === 0
                ? 'There are currently no universities configured in the database. Partner universities added by administrators will appear here.'
                : 'No universities match your search query and country selection.'}
            </p>
          </div>
        </Card>
      )}

      {/* Real Universities Grid */}
      {!loading && !error && filteredUnis.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredUnis.map(uni => {
            const programsCount = (uni.programs || []).length;
            const logoLetter = (uni.name || 'U').slice(0, 1).toUpperCase();

            return (
              <Card
                key={uni.id}
                className="p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3.5 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-[#58051E]/10 text-[#58051E] font-black flex items-center justify-center text-sm border border-[#58051E]/20 shrink-0">
                      {uni.logo_url ? (
                        <img src={uni.logo_url} alt={uni.name} className="w-8 h-8 rounded-lg object-contain" />
                      ) : (
                        logoLetter
                      )}
                    </div>

                    {uni.ranking && (
                      <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-600 fill-amber-400" />
                        Rank #{uni.ranking}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-snug">
                      {uni.name}
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{uni.city ? `${uni.city}, ` : ''}{uni.country}</span>
                    </div>
                  </div>

                  {uni.tuition_range && (
                    <div className="text-[11px] font-bold text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-400 font-semibold">Tuition:</span>
                      <span className="text-slate-900">{uni.tuition_range}</span>
                    </div>
                  )}

                  {programsCount > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(uni.programs || []).slice(0, 2).map((prog, idx) => (
                        <span key={idx} className="text-[9.5px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {prog}
                        </span>
                      ))}
                      {programsCount > 2 && (
                        <span className="text-[9.5px] font-bold text-[#58051E] bg-[#58051E]/10 px-1.5 py-0.5 rounded">
                          +{programsCount - 2} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedUni(uni)}
                  className="w-full text-xs font-bold text-[#58051E] border-[#58051E]/30 hover:bg-[#58051E]/5 mt-2"
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                  View Program Details
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* University Program Details Modal */}
      <AnimatePresence>
        {selectedUni && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900 z-50"
              onClick={() => setSelectedUni(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-xl max-h-[90vh] bg-white rounded-3xl p-6 shadow-2xl space-y-4 overflow-y-auto text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">{selectedUni.name}</h3>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {selectedUni.city ? `${selectedUni.city}, ` : ''}{selectedUni.country} • Partner Institution
                  </span>
                </div>
                <button
                  onClick={() => setSelectedUni(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedUni.description && (
                <p className="text-xs font-semibold text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {selectedUni.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Tuition Range</span>
                  <span className="font-bold text-slate-800">{selectedUni.tuition_range || 'Contact admissions'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Academic Intakes</span>
                  <span className="font-bold text-slate-800">{(selectedUni.intakes || ['September', 'January']).join(', ')}</span>
                </div>
              </div>

              {/* Available Academic Programs */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-[#58051E]" /> Available Degree Programs ({selectedUni.programs?.length || 0})
                </h4>
                {(!selectedUni.programs || selectedUni.programs.length === 0) ? (
                  <p className="text-xs font-semibold text-slate-400">
                    Full academic program list is managed through admissions office.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedUni.programs.map((prog, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800">
                        {prog}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedUni(null)}
                  className="text-xs font-bold"
                >
                  Close Catalog View
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
