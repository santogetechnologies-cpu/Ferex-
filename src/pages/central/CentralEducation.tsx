import { UniversityBulkUpload } from '../../components/UniversityBulkUpload';
import { UniversityImage } from '../../components/UniversityImage';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Search, Plus, MapPin, Trash2, X, CheckCircle2, Star, Edit2, Image as ImageIcon, Globe, Coins } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import { useUniversities } from '../../hooks/useUniversities';
import { useDestinations } from '../../hooks/useDestinations';
import type { University } from '../../lib/types';
import { formatFeeEURandINR } from '../admin/AdminUniversities';

export const CentralEducation: React.FC = () => {
  const { universities, loading, refresh, addUniversity, updateUniversity, removeUniversity } = useUniversities();
  const { destinations } = useDestinations();

  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUni, setEditingUni] = useState<University | null>(null);
  const [toast, setToast] = useState('');

  const [newUni, setNewUni] = useState({
    name: '',
    city: '',
    country: 'Poland',
    tuition: '15,000 PLN / yr',
    banner_image_url: '',
    logo_url: '',
    programs: ['Computer Science', 'Business Management'],
    ranking: 50,
  });

  const [editForm, setEditForm] = useState<Partial<University>>({});

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Dynamically union all countries from destinations and universities
  const availableCountries = Array.from(new Set([
    'Poland', 'Germany', 'United Kingdom', 'Canada', 'France', 'Netherlands', 'Italy', 'Spain',
    ...destinations.map(d => d.name),
    ...universities.map(u => u.country)
  ].filter(Boolean))).sort();

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUni.name) return;

    try {
      const banner = newUni.banner_image_url.trim();
      await addUniversity({
        name: newUni.name.trim(),
        city: newUni.city.trim(),
        country: newUni.country.trim(),
        ranking: Number(newUni.ranking) || 100,
        tuition_range: newUni.tuition.trim(),
        banner_image_url: banner,
        image_url: banner,
        logo_url: newUni.logo_url.trim(),
        programs: newUni.programs,
        rating: 4.8,
      });
      showToastMsg('Partner university added successfully');
      setShowAddModal(false);
      setNewUni({ name: '', city: '', country: 'Poland', tuition: '15,000 PLN / yr', banner_image_url: '', logo_url: '', programs: ['Computer Science'], ranking: 50 });
    } catch (err: any) {
      showToastMsg(`Error: ${err.message || 'Failed to add university'}`);
    }
  };

  const handleStartEdit = (uni: University) => {
    setEditingUni(uni);
    setEditForm({
      name: uni.name,
      city: uni.city || '',
      country: uni.country,
      tuition_range: uni.tuition_range || '',
      banner_image_url: uni.banner_image_url || uni.image_url || '',
      logo_url: uni.logo_url || '',
      ranking: uni.ranking || 100,
      rating: uni.rating || 4.8,
      programs: uni.programs || [],
      vfs_fee: uni.vfs_fee || '',
      agency_fee: uni.agency_fee || '',
      direct_payment_instructions: uni.direct_payment_instructions || ''
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUni || !editForm.name) return;

    try {
      const banner = (editForm.banner_image_url || '').trim();
      await updateUniversity(editingUni.id, {
        ...editForm,
        image_url: banner,
        banner_image_url: banner,
        logo_url: (editForm.logo_url || '').trim(),
      });
      showToastMsg('University details updated successfully');
      setEditingUni(null);
    } catch (err: any) {
      showToastMsg(`Error: ${err.message || 'Failed to update university'}`);
    }
  };

  const handleDeletePartner = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this university from the catalog?')) return;
    try {
      await removeUniversity(id);
      showToastMsg('Partner university removed from catalog');
    } catch (err: any) {
      showToastMsg(`Error: ${err.message || 'Failed to remove university'}`);
    }
  };

  const flagMap: Record<string, string> = { Poland: 'PL', Germany: 'DE', Netherlands: 'NL', UK: 'UK', France: 'FR', Italy: 'IT', Spain: 'ES', Canada: 'CA' };

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
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#58051E]" /> Ferex Education
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Partner universities, fees and images.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <UniversityBulkUpload onComplete={() => refresh()} />
          <Button size="sm" className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Partner University
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search university, country, or city..."
            className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]/40"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {['All', ...Array.from(new Set(universities.map(u => u.country))).sort()].map((c) => (
            <button
              key={c}
              onClick={() => setCountryFilter(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                countryFilter === c ? 'bg-[#58051E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
            No partner universities found matching criteria. Click "Add Partner University" or "Bulk Upload CSV" to populate the catalog.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPartners.map((uni) => {
            const banner = uni.banner_image_url || uni.image_url;
            return (
              <Card key={uni.id} className="border border-slate-200/70 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group">
                {/* University Banner Image */}
                <div className="h-32 w-full bg-slate-100 relative overflow-hidden">
                  <UniversityImage src={banner} name={uni.name} country={uni.country} className="group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs border border-white/40 text-[11px] font-black font-mono text-slate-800 shadow-xs">
                      {flagMap[uni.country] || uni.country.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border bg-emerald-500/90 text-white border-emerald-400 shadow-xs">
                      Active
                    </span>
                  </div>
                  {uni.logo_url && (
                    <div className="absolute bottom-2 right-2 w-9 h-9 rounded-xl bg-white p-1 border border-slate-200 shadow-md">
                      <img src={uni.logo_url} alt="" className="w-full h-full object-contain rounded-lg" />
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 group-hover:text-[#58051E] transition-colors line-clamp-1">{uni.name}</h3>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {uni.city ? `${uni.city}, ${uni.country}` : uni.country}
                    </p>

                    <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-left">
                      <div>
                        <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Ranking</span>
                        <span className="text-xs font-bold text-slate-800">#{uni.ranking || 100}</span>
                      </div>
                      <div>
                        <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Rating</span>
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" /> {uni.rating || 4.8}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Programs</span>
                        <span className="text-xs font-bold text-slate-800">{uni.programs?.length || 1} Courses</span>
                      </div>
                      <div>
                        <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Tuition Fee</span>
                        <span className="text-xs font-bold text-[#58051E] block line-clamp-1" title={uni.tuition_range || ''}>
                          {formatFeeEURandINR(uni.tuition_range || (uni.tuition_fee_pln ? `${uni.tuition_fee_pln} PLN / yr` : '—'))}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {uni.nawa_required ? '• NAWA / Polish Desk' : '• European Desk'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(uni)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Edit university & banner"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePartner(uni.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Remove partner"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Partner Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Add University Partner</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddPartner} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">University Name *</label>
                  <input type="text" required value={newUni.name} onChange={(e) => setNewUni({ ...newUni, name: e.target.value })} placeholder="e.g. Warsaw University of Technology" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Country *</label>
                    <select value={newUni.country} onChange={(e) => setNewUni({ ...newUni, country: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      {availableCountries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">City / Campus</label>
                    <input type="text" value={newUni.city} onChange={(e) => setNewUni({ ...newUni, city: e.target.value })} placeholder="e.g. Warsaw" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Tuition Fee (Multi-Currency)</label>
                    <input type="text" value={newUni.tuition} onChange={(e) => setNewUni({ ...newUni, tuition: e.target.value })} placeholder="e.g. 15,000 PLN / yr or €3,500 / yr" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Global Ranking</label>
                    <input type="number" value={newUni.ranking} onChange={(e) => setNewUni({ ...newUni, ranking: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Campus Banner Image URL</label>
                  <input type="url" value={newUni.banner_image_url} onChange={(e) => setNewUni({ ...newUni, banner_image_url: e.target.value })} placeholder="https://... campus banner image" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Logo URL</label>
                  <input type="url" value={newUni.logo_url} onChange={(e) => setNewUni({ ...newUni, logo_url: e.target.value })} placeholder="https://... logo image" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Degree Programs (comma separated)</label>
                  <input type="text" value={newUni.programs.join(', ')} onChange={(e) => setNewUni({ ...newUni, programs: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Computer Science, Business Administration..." className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">Save Partner</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Partner Modal */}
      <AnimatePresence>
        {editingUni && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setEditingUni(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-[#58051E]" />
                  <h3 className="text-sm font-black text-slate-900">Edit University Details</h3>
                </div>
                <button onClick={() => setEditingUni(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSaveEdit} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">University Name *</label>
                  <input type="text" required value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Country *</label>
                    <select value={editForm.country || 'Poland'} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      {availableCountries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">City / Campus</label>
                    <input type="text" value={editForm.city || ''} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Tuition Fee (Multi-Currency: PLN, EUR, USD)</label>
                    <input type="text" value={editForm.tuition_range || ''} onChange={(e) => setEditForm({ ...editForm, tuition_range: e.target.value })} placeholder="e.g. 15,000 PLN / yr" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Ranking</label>
                    <input type="number" value={editForm.ranking || 100} onChange={(e) => setEditForm({ ...editForm, ranking: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Campus Banner Image URL</label>
                  <input type="url" value={editForm.banner_image_url || ''} onChange={(e) => setEditForm({ ...editForm, banner_image_url: e.target.value })} placeholder="https://... banner image" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Logo URL</label>
                  <input type="url" value={editForm.logo_url || ''} onChange={(e) => setEditForm({ ...editForm, logo_url: e.target.value })} placeholder="https://... logo image" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Direct Student Tuition Payment Instructions (Flywire/Bank)</label>
                  <textarea rows={2} value={editForm.direct_payment_instructions || ''} onChange={(e) => setEditForm({ ...editForm, direct_payment_instructions: e.target.value })} placeholder="Bank wire IBAN / Flywire portal code for students to pay directly..." className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setEditingUni(null)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">Save Changes</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
