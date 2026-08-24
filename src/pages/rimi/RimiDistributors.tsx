import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Search, Plus, Eye, X, CheckCircle2, MapPin } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const RimiDistributors: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDist, setSelectedDist] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');

  const [distributors, setDistributors] = useState([
    { id: 'DST-301', name: 'Western Cold Chain Distributors Ltd', region: 'Western Zone (Maharashtra & Gujarat)', contact: 'Sunil Mehta', volume: '₹42.50 Lakhs / mo', status: 'Active Regional' },
    { id: 'DST-302', name: 'North India Frozen Supply Network', region: 'Northern Zone (Delhi & Punjab)', contact: 'Harpreet Singh', volume: '₹38.10 Lakhs / mo', status: 'Active Regional' },
    { id: 'DST-303', name: 'South Coast Reefer Agencies', region: 'Southern Zone (Karnataka & Tamil Nadu)', contact: 'K. Sunderam', volume: '₹28.40 Lakhs / mo', status: 'Active Regional' },
  ]);

  const [newDist, setNewDist] = useState({ name: '', region: 'Western Zone', contact: '' });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddDist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDist.name) return;
    const created = {
      id: `DST-${Math.floor(300 + Math.random() * 90)}`,
      ...newDist,
      volume: '₹15.00 Lakhs / mo',
      status: 'Active Regional'
    };
    setDistributors([created, ...distributors]);
    setShowAddModal(false);
    showToastMsg(`Added regional distributor ${newDist.name}`);
    setNewDist({ name: '', region: 'Western Zone', contact: '' });
  };

  const filteredDist = distributors.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.region.toLowerCase().includes(searchQuery.toLowerCase())
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
            <Building2 className="w-5 h-5 text-[#6A1B2E]" /> Regional Distributor Partners
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Rimi Cold Chain Console • Regional master distributors, territory allocation, and fulfillment quotas.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Regional Distributor
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search distributor or region..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredDist.length} Master Distributors</span>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {filteredDist.map((d) => (
          <Card key={d.id} className="p-5 border border-slate-200/70 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase">{d.id}</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">{d.status}</span>
              </div>
              <h3 className="text-sm font-black text-slate-900">{d.name}</h3>
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#6A1B2E]" /> {d.region}
              </p>
              <div className="text-base font-black text-slate-900 pt-1">{d.volume}</div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">{d.contact}</span>
              <button onClick={() => setSelectedDist(d)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Add Regional Distributor</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddDist} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Distributor Agency Name</label>
                  <input type="text" required value={newDist.name} onChange={(e) => setNewDist({ ...newDist, name: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Assigned Territory / Region</label>
                  <input type="text" required value={newDist.region} onChange={(e) => setNewDist({ ...newDist, region: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Contact Executive</label>
                  <input type="text" required value={newDist.contact} onChange={(e) => setNewDist({ ...newDist, contact: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save Distributor</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {selectedDist && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedDist(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Distributor Agency Inspector</h3>
                <button onClick={() => setSelectedDist(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{selectedDist.id}</span>
                  <h4 className="text-base font-black text-slate-900">{selectedDist.name}</h4>
                  <p className="text-xs font-semibold text-slate-500">{selectedDist.region}</p>
                </div>

                <Button size="sm" className="w-full text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => {
                  showToastMsg(`Updated territory quota for ${selectedDist.id}`);
                }}>
                  Update Fulfillment Quotas
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
