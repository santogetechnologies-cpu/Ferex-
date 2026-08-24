import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Search, Plus, MapPin, Trash2, X, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useUniversities } from '../../hooks/useUniversities';

export const CentralEducation: React.FC = () => {
  const { universities, loading, addUniversity, removeUniversity } = useUniversities();

  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');

  const [newUni, setNewUni] = useState({
    name: '',
    city: '',
    country: 'Poland',
    ranking: '150',
    tuition: '€3,500 - €5,000 / yr'
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUni.name.trim()) return;
    try {
      await addUniversity({
        name: newUni.name.trim(),
        city: newUni.city.trim() || 'Main Campus',
        country: newUni.country,
        ranking: parseInt(newUni.ranking) || 100,
        tuition_range: newUni.tuition.trim() || '€3,500 / yr'
      });
      setShowAddModal(false);
      showToastMsg(`Added ${newUni.name} to university alliances!`);
      setNewUni({ name: '', city: '', country: 'Poland', ranking: '150', tuition: '€3,500 - €5,000 / yr' });
    } catch (err: any) {
      showToastMsg(`Error: ${err.message || 'Failed to add university'}`);
    }
  };

  const handleDeletePartner = async (id: string) => {
    try {
      await removeUniversity(id);
      showToastMsg('Partner university removed from catalog');
    } catch (err: any) {
      showToastMsg(`Error: ${err.message || 'Failed to remove university'}`);
    }
  };

  const flagMap: Record<string, string> = { Poland: '🇵🇱', Germany: '🇩🇪', Netherlands: '🇳🇱', UK: '🇬🇧', France: '🇫🇷', Italy: '🇮🇹', Spain: '🇪🇸' };

  const filteredPartners = universities.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.country.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCountry = countryFilter === 'All' || p.country === countryFilter;
    return matchesSearch && matchesCountry;
  });

  return (
    <div className="space-y-6 text-left">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#6A1B2E]" /> Education Alliances & Universities
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Super Admin Console • Global partner university network, tuition rates, and enrollment quotas.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Partner University
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search university or city..."
            className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]/40"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {['All', 'Poland', 'Germany', 'Netherlands'].map((c) => (
            <button
              key={c}
              onClick={() => setCountryFilter(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                countryFilter === c ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </Card>

      {/* University Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs font-bold text-slate-400">Loading alliance universities...</div>
      ) : filteredPartners.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-2xl p-12 text-center shadow-xs">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No Universities Cataloged</h3>
          <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm mx-auto">
            No partner universities found matching criteria. Click "Add Partner University" to create a record.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPartners.map((uni) => (
            <Card key={uni.id} className="p-5 border border-slate-200/70 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{flagMap[uni.country] || '🇪🇺'}</span>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                    Active Partner
                  </span>
                </div>
                <h3 className="text-sm font-black text-slate-900 group-hover:text-[#6A1B2E] transition-colors">{uni.name}</h3>
                <p className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {uni.city ? `${uni.city}, ${uni.country}` : uni.country}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-left">
                  <div>
                    <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Global Rank</span>
                    <span className="text-xs font-bold text-slate-800">#{uni.ranking || 100}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Rating</span>
                    <span className="text-xs font-bold text-slate-800">⭐ {uni.rating || 4.8} / 5</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Programs</span>
                    <span className="text-xs font-bold text-slate-800">{uni.programs?.length || 1} Offered</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Tuition</span>
                    <span className="text-xs font-bold text-slate-800">{uni.tuition_range || '€3,500 / yr'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleDeletePartner(uni.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Remove partner"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Partner Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Add University Partner</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddPartner} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">University Name *</label>
                  <input type="text" required value={newUni.name} onChange={(e) => setNewUni({ ...newUni, name: e.target.value })} placeholder="e.g. Technical University" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#6A1B2E]" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">City / Location</label>
                  <input type="text" value={newUni.city} onChange={(e) => setNewUni({ ...newUni, city: e.target.value })} placeholder="e.g. Berlin" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#6A1B2E]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Country</label>
                    <select value={newUni.country} onChange={(e) => setNewUni({ ...newUni, country: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="Poland">Poland</option>
                      <option value="Germany">Germany</option>
                      <option value="Netherlands">Netherlands</option>
                      <option value="France">France</option>
                      <option value="Italy">Italy</option>
                      <option value="Spain">Spain</option>
                      <option value="United Kingdom">United Kingdom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Tuition Fee</label>
                    <input type="text" value={newUni.tuition} onChange={(e) => setNewUni({ ...newUni, tuition: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save Partner</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
