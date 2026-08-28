import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, CheckCircle2, Video, Plus, X } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getAllMeetings, createMeeting } from '../../lib/api/meetings';

export const StaffMeetings: React.FC = () => {
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const loadData = async () => {
    setLoading(true);
    const data = await getAllMeetings();
    setMeetings(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleSchedule = async () => {
    if (!newTitle.trim()) return;
    await createMeeting({
      subject: newTitle,
      advisor_name: 'Admissions Counselor',
      scheduled_date: new Date().toISOString().split('T')[0],
      start_time: '02:30 PM',
      meeting_link: 'https://meet.google.com/abc-defg-hij',
      notes: 'Visa consultation and document verification.',
    });
    showToast('Consultation meeting scheduled!');
    setShowScheduleModal(false);
    setNewTitle('');
    await loadData();
  };

  return (
    <div className="space-y-6 text-left antialiased select-none">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#6A1B2E]" /> Student Consultation Meeting Workspace
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Scheduled video consultation sessions, visa guidance appointments, and calendar management.</p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowScheduleModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Schedule Consultation
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Agenda Cards */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="p-8 text-center text-xs font-bold text-slate-400">Loading consultation meetings...</div>
          ) : meetings.length === 0 ? (
            <div className="p-8 text-center text-xs font-bold text-slate-400">No scheduled consultations found.</div>
          ) : (
            meetings.map(m => {
              const meetingId = m.id?.slice(0, 8) || 'MTG-001';
              const title = m.subject || m.title || 'Consultation Session';
              const studentName = m.users?.full_name || m.student || 'Assigned Student';
              const time = `${m.start_time || '02:30 PM'} - ${m.end_time || '03:15 PM'}`;
              const platform = m.meeting_link?.includes('zoom') ? 'Zoom Video' : 'Google Meet';
              const notes = m.notes || 'Admissions & document verification review.';

              return (
                <Card key={m.id} className="p-5 border border-slate-200/80 shadow-xs hover:shadow-lg transition-all space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#6A1B2E]">{meetingId} • {m.scheduled_date || 'Today'}</span>
                      <h3 className="text-base font-black text-slate-900">{title}</h3>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">Student: {studentName}</p>
                    </div>
                    <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold shrink-0" onClick={() => showToast(`Launching ${platform} call for ${title}...`)}>
                      <Video className="w-3.5 h-3.5 mr-1.5" /> Join {platform}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold text-slate-600">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Time Slot</span>
                      <span className="font-black text-slate-900">{time}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Consultation Agenda</span>
                      <span className="font-bold text-slate-800">{notes}</span>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Right Column: Mini August 2026 Interactive Calendar */}
        <div>
          <Card className="p-5 border border-slate-200/80 shadow-xs space-y-4 text-center">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">August 2026 Calendar</h3>
            <div className="grid grid-cols-7 gap-1 text-[11px] font-bold text-slate-600">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-slate-400 py-1">{d}</div>)}
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <div key={day} className={`py-1.5 rounded-lg text-xs font-bold transition-all ${day === 6 ? 'bg-[#6A1B2E] text-white shadow-xs font-black' : day === 7 || day === 8 ? 'bg-amber-100 text-amber-900 font-bold' : 'hover:bg-slate-100'}`}>
                  {day}
                </div>
              ))}
            </div>
            <p className="text-[10.5px] font-semibold text-slate-400 pt-2 border-t border-slate-100">Highlighted days indicate scheduled student video calls.</p>
          </Card>
        </div>
      </div>

      {/* Schedule Modal */}
      <AnimatePresence>
        {showScheduleModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setShowScheduleModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">Schedule Consultation Meeting</h3>
                <button onClick={() => setShowScheduleModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-3 text-xs font-semibold">
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Meeting Title</label>
                  <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Visa SOP Final Audit" className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900" />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Platform</label>
                  <select className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900">
                    <option>Google Meet</option>
                    <option>Zoom Video</option>
                  </select>
                </div>
              </div>

              <Button size="sm" className="w-full bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={handleSchedule}>
                Confirm Consultation Session
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
