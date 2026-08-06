import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Search, Plus, MapPin, Trash2, X, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const CentralEducation: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');

  const [partners, setPartners] = useState([
    {
      id: 1,
      name: 'University of Warsaw',
      location: 'Warsaw, Poland',
      country: 'Poland',
      ranking: 'QS Global Rank: #262',
      programsCount: 14,
      enrolledCount: 640,
      annualFee: '€3,500',
      status: 'Active Alliance',
      flag: '🇵🇱'
    },
    {
      id: 2,
      name: 'Technical University of Berlin (TU Berlin)',
      location: 'Berlin, Germany',
      country: 'Germany',
      ranking: 'QS Global Rank: #154',
      programsCount: 18,
      enrolledCount: 480,
      annualFee: '€0 (Semester Fee €300)',
      status: 'Active Alliance',
      flag: '🇩🇪'
    },
    {
      id: 3,
      name: 'University of Amsterdam',
      location: 'Amsterdam, Netherlands',
      country: 'Netherlands',
      ranking: 'QS Global Rank: #53',
      programsCount: 12,
      enrolledCount: 360,
      annualFee: '€16,500',
      status: 'Active Alliance',
      flag: '🇳🇱'
    },
    {
      id: 4,
      name: 'Leiden University',
      location: 'Leiden, Netherlands',
      country: 'Netherlands',
      ranking: 'QS Global Rank: #126',
      programsCount: 9,
      enrolledCount: 190,
      annualFee: '€19,300',
      status: 'Reviewing Quotas',
      flag: '🇳🇱'
    },
    {
      id: 5,
      name: 'University of Gdansk',
      location: 'Gdansk, Poland',
      country: 'Poland',
      ranking: 'QS Global Rank: #801',
      programsCount: 8,
      enrolledCount: 120,
      annualFee: '€3,000',
      status: 'Active Alliance',
      flag: '🇵🇱'
    }
  ]);

  const [newUni, setNewUni] = useState({
    name: '',
    location: '',
    country: 'Poland',
    ranking: 'QS Global Rank: #300',
    programsCount: 10,
    annualFee: '€4,000'
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUni.name || !newUni.location) return;
    const flagMap: Record<string, string> = { Poland: '🇵🇱', Germany: '🇩🇪', Netherlands: '🇳🇱', UK: '🇬🇧' };
    const created = {
      id: Date.now(),
      ...newUni,
      enrolledCount: 0,
      status: 'Active Alliance',
      flag: flagMap[newUni.country] || '🇪🇺'
    };
    setPartners([created, ...partners]);
    setShowAddModal(false);
    showToastMsg(`Added ${newUni.name} to university alliances!`);
    setNewUni({ name: '', location: '', country: 'Poland', ranking: 'QS Global Rank: #300', programsCount: 10, annualFee: '€4,000' });
  };

  const handleDeletePartner = (id: number) => {
    setPartners(partners.filter(p => p.id !== id));
    showToastMsg('Partner university removed from catalog');
  };

  const filteredPartners = partners.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.location.toLowerCase().includes(searchQuery.toLowerCase());
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPartners.map((uni) => (
          <Card key={uni.id} className="p-5 border border-slate-200/70 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{uni.flag}</span>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  uni.status === 'Active Alliance' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {uni.status}
                </span>
              </div>
              <h3 className="text-sm font-black text-slate-900 group-hover:text-[#6A1B2E] transition-colors">{uni.name}</h3>
              <p className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {uni.location}
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-left">
                <div>
                  <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Ranking</span>
                  <span className="text-xs font-bold text-slate-800">{uni.ranking}</span>
                </div>
                <div>
                  <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Enrolled</span>
                  <span className="text-xs font-bold text-slate-800">{uni.enrolledCount} Students</span>
                </div>
                <div>
                  <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Programs</span>
                  <span className="text-xs font-bold text-slate-800">{uni.programsCount} Courses</span>
                </div>
                <div>
                  <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Tuition</span>
                  <span className="text-xs font-bold text-slate-800">{uni.annualFee}</span>
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
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">University Name</label>
                  <input type="text" required value={newUni.name} onChange={(e) => setNewUni({ ...newUni, name: e.target.value })} placeholder="e.g. University of Warsaw" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#6A1B2E]" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Location & City</label>
                  <input type="text" required value={newUni.location} onChange={(e) => setNewUni({ ...newUni, location: e.target.value })} placeholder="e.g. Warsaw, Poland" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#6A1B2E]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Country</label>
                    <select value={newUni.country} onChange={(e) => setNewUni({ ...newUni, country: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="Poland">Poland</option>
                      <option value="Germany">Germany</option>
                      <option value="Netherlands">Netherlands</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Annual Fee</label>
                    <input type="text" value={newUni.annualFee} onChange={(e) => setNewUni({ ...newUni, annualFee: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
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
