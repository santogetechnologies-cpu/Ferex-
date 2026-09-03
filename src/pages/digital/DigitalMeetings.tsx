import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, X, CheckCircle2, Trash2, Video, Search } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getDigitalMeetings, createDigitalMeeting, deleteDigitalMeeting, getDigitalClients } from '../../lib/api/digital';

export const DigitalMeetings: React.FC = () => {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');

  const [newMtg, setNewMtg] = useState({
    title: '',
    client: 'Nexus FinTech Global',
    time: 'Tomorrow, 03:00 PM',
    link: 'https://meet.google.com/fer-dig-arch'
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mtgData, clientData] = await Promise.all([
        getDigitalMeetings(),
        getDigitalClients()
      ]);
      setMeetings(mtgData);
      setClients(clientData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_digital_meetings_change', handleLocalChange);

    return () => {
      window.removeEventListener('ferex_digital_meetings_change', handleLocalChange);
    };
  }, [loadData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMtg.title) return;
    await createDigitalMeeting(newMtg);
    setShowAddModal(false);
    showToast(`Scheduled meeting: ${newMtg.title}`);
    setNewMtg({ title: '', client: clients.length > 0 ? (clients[0].company_name || clients[0].name) : 'Nexus FinTech Global', time: 'Tomorrow, 03:00 PM', link: 'https://meet.google.com/fer-dig-arch' });
    await loadData();
  };

  const handleDelete = async (id: string) => {
    await deleteDigitalMeeting(id);
    setMeetings(prev => prev.filter(m => m.id !== id));
    showToast('Meeting cancelled');
  };

  const filtered = meetings.filter(m =>
    (m.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.client || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#6A1B2E]" /> Client Meeting Scheduler & Calls
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Digital ERP • Sprint architecture reviews, UI/UX demo sessions, and client discovery calls.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Schedule Client Call
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search meeting title or client..."
            className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
          />
        </div>
        <span className="text-xs font-bold text-slate-400">{filtered.length} Scheduled Calls</span>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading meeting schedule...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((m) => (
            <Card key={m.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-[#6A1B2E] bg-[#6A1B2E]/10 px-2 py-0.5 rounded-md">{m.id}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">{m.status || 'Scheduled'}</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-snug">{m.title}</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">{m.client}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                  <span className="text-[10px] uppercase font-extrabold text-slate-400">Scheduled Time</span>
                  <div className="font-bold text-slate-800">{m.time}</div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <a href={m.link || '#'} target="_blank" rel="noreferrer" className="flex-1 text-center py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center justify-center gap-1">
                  <Video className="w-3.5 h-3.5 text-blue-600" /> Join Meet
                </a>
                <button onClick={() => handleDelete(m.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Schedule Client Call</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Meeting Purpose</label>
                  <input type="text" required value={newMtg.title} onChange={(e) => setNewMtg({ ...newMtg, title: e.target.value })} placeholder="e.g. Architecture & API Review" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Client</label>
                  {clients.length > 0 ? (
                    <select value={newMtg.client} onChange={(e) => setNewMtg({ ...newMtg, client: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      {clients.map(c => (
                        <option key={c.id} value={c.company_name || c.name}>{c.company_name || c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" value={newMtg.client} onChange={(e) => setNewMtg({ ...newMtg, client: e.target.value })} placeholder="Nexus FinTech Global" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Timing & Date</label>
                  <input type="text" required value={newMtg.time} onChange={(e) => setNewMtg({ ...newMtg, time: e.target.value })} placeholder="Tomorrow, 03:00 PM" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Google Meet / Zoom URL</label>
                  <input type="url" value={newMtg.link} onChange={(e) => setNewMtg({ ...newMtg, link: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Schedule Call</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
