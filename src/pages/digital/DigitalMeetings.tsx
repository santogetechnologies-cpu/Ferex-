import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, X, CheckCircle2, Clock, Users, Video } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

const initialMeetings = [
  { id: 'MTG-001', title: 'Tata Motors Project Review', client: 'Tata Motors Digital', date: '2026-08-06', time: '15:00', duration: '60 min', attendees: 4, type: 'Google Meet', link: 'https://meet.google.com', status: 'Upcoming' },
  { id: 'MTG-002', title: 'Reliance Digital Q3 Planning', client: 'Reliance Digital', date: '2026-08-07', time: '11:00', duration: '90 min', attendees: 6, type: 'Zoom', link: 'https://zoom.us', status: 'Upcoming' },
  { id: 'MTG-003', title: 'Mahindra Brand Strategy Workshop', client: 'Mahindra Fintech', date: '2026-08-08', time: '14:30', duration: '120 min', attendees: 3, type: 'Office', link: '', status: 'Upcoming' },
  { id: 'MTG-004', title: 'BigBasket SEO Monthly Review', client: 'BigBasket Growth', date: '2026-07-31', time: '10:00', duration: '45 min', attendees: 2, type: 'Zoom', link: 'https://zoom.us', status: 'Completed' },
  { id: 'MTG-005', title: 'HDFC Life Final Handoff', client: 'HDFC Life Insurance', date: '2026-07-28', time: '16:00', duration: '60 min', attendees: 5, type: 'Teams', link: 'https://teams.microsoft.com', status: 'Completed' },
];

export const DigitalMeetings: React.FC = () => {
  const [meetings, setMeetings] = useState(initialMeetings);
  const [filterStatus, setFilterStatus] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [toast, setToast] = useState('');
  const [newMtg, setNewMtg] = useState({ title: '', client: '', date: '', time: '10:00', duration: '60 min', attendees: 2, type: 'Zoom', link: '' });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setMeetings([{ id: `MTG-${Math.floor(Math.random() * 900 + 100)}`, status: 'Upcoming', ...newMtg }, ...meetings]);
    setShowAddModal(false);
    showToast('Meeting scheduled!');
    setNewMtg({ title: '', client: '', date: '', time: '10:00', duration: '60 min', attendees: 2, type: 'Zoom', link: '' });
  };

  const markDone = (id: string) => {
    setMeetings(meetings.map(m => m.id === id ? { ...m, status: 'Completed' } : m));
    setSelectedMeeting(null);
    showToast('Meeting marked as completed!');
  };

  const remove = (id: string) => { setMeetings(meetings.filter(m => m.id !== id)); showToast('Meeting removed'); };

  const filtered = meetings.filter(m => filterStatus === 'All' || m.status === filterStatus);

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
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2"><Calendar className="w-5 h-5 text-[#6A1B2E]" /> Meeting Scheduler & Calendar</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Schedule and manage client meetings, syncs, workshops, and discovery calls.</p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Schedule Meeting
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5">
        {['All', 'Upcoming', 'Completed'].map(t => (
          <button key={t} onClick={() => setFilterStatus(t)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === t ? 'bg-[#6A1B2E] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(m => (
          <Card key={m.id} className="p-5 border border-slate-200/70 shadow-xs hover:shadow-md transition-all space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${m.status === 'Upcoming' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{m.status}</span>
                  <span className="text-[10px] font-extrabold text-slate-400">{m.type}</span>
                </div>
                <h3 className="text-sm font-black text-slate-900">{m.title}</h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">{m.client}</p>
              </div>
              <button onClick={() => remove(m.id)} className="p-1 text-slate-300 hover:text-red-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-[#6A1B2E]" />{m.date}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#6A1B2E]" />{m.time} · {m.duration}</span>
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-[#6A1B2E]" />{m.attendees} attendees</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button onClick={() => setSelectedMeeting(m)} className="flex-1 py-1.5 text-xs font-bold rounded-xl border border-slate-200 hover:border-[#6A1B2E] hover:text-[#6A1B2E] transition-all text-slate-600">View Details</button>
              {m.status === 'Upcoming' && (
                <button onClick={() => { showToast(`Joining ${m.type}...`); }} className="flex-1 py-1.5 text-xs font-bold rounded-xl bg-[#6A1B2E] text-white hover:bg-[#521221] transition-all flex items-center justify-center gap-1.5">
                  <Video className="w-3.5 h-3.5" /> Join Now
                </button>
              )}
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
                <h3 className="text-sm font-black text-slate-900">Schedule New Meeting</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3">
                <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Meeting Title</label>
                  <input type="text" required value={newMtg.title} onChange={e => setNewMtg({...newMtg, title: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Client</label>
                  <input type="text" required value={newMtg.client} onChange={e => setNewMtg({...newMtg, client: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Date</label>
                    <input type="date" required value={newMtg.date} onChange={e => setNewMtg({...newMtg, date: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Time</label>
                    <input type="time" required value={newMtg.time} onChange={e => setNewMtg({...newMtg, time: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Platform</label>
                    <select value={newMtg.type} onChange={e => setNewMtg({...newMtg, type: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      {['Zoom', 'Google Meet', 'Teams', 'Office'].map(t => <option key={t}>{t}</option>)}
                    </select></div>
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Attendees</label>
                    <input type="number" min={1} value={newMtg.attendees} onChange={e => setNewMtg({...newMtg, attendees: parseInt(e.target.value)})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Schedule</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedMeeting && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedMeeting(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Meeting Details</h3>
                <button onClick={() => setSelectedMeeting(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border inline-block ${selectedMeeting.status === 'Upcoming' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{selectedMeeting.status}</span>
                  <h4 className="text-sm font-black text-slate-900">{selectedMeeting.title}</h4>
                  <div className="text-xs font-semibold text-slate-600 space-y-1">
                    <p>Client: <span className="font-bold text-slate-800">{selectedMeeting.client}</span></p>
                    <p>Date: {selectedMeeting.date} at {selectedMeeting.time}</p>
                    <p>Duration: {selectedMeeting.duration}</p>
                    <p>Attendees: {selectedMeeting.attendees}</p>
                    <p>Platform: <span className="font-bold text-slate-800">{selectedMeeting.type}</span></p>
                  </div>
                </div>
                {selectedMeeting.status === 'Upcoming' && (
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => showToast(`Joining ${selectedMeeting.type}...`)}>
                      <Video className="w-4 h-4 mr-1.5" /> Join Meeting
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => markDone(selectedMeeting.id)}>
                      Mark Completed
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
