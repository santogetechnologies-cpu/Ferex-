import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, User, Video, Mic, MicOff, VideoOff, PhoneOff, ChevronLeft, ChevronRight, Plus, X, Sparkles, Trash2 } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { useMeetings } from '../hooks/useMeetings';
import { computeEndTime } from '../lib/api/meetings';
import { getStaffMembers } from '../lib/api/students';

export const Meetings: React.FC = () => {
  const { user } = useAuth();
  const { meetings: dbMeetings, addMeeting, deleteCall, loading } = useMeetings(user?.id);

  // Proper Interactive Calendar Helpers
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentMonth(prev => {
      if (prev === 0) {
        setCurrentYear(y => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      if (prev === 11) {
        setCurrentYear(y => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const handleDeleteCall = async (id: string, subjectName: string) => {
    await deleteCall(id);
    showToast(`Scheduled session "${subjectName}" cancelled.`);
  };

  // Video call states
  const [activeCallSubject, setActiveCallSubject] = useState<string | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  // Local Date Helper to avoid UTC offset bugs
  const getLocalDateString = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split('T')[0];
  };

  // Book Meeting Modal
  const [showBookModal, setShowBookModal] = useState(false);
  const [subject, setSubject] = useState('Visa & Embassy Guidance Session');
  const [scheduledDate, setScheduledDate] = useState(getLocalDateString());
  const [startTime, setStartTime] = useState('10:00 AM');
  const [counselorsList, setCounselorsList] = useState<string[]>(['Dr. Evelyn Carter', 'Riya Shah', 'Arjun Pillai', 'Meena Iyer']);
  const [advisorName, setAdvisorName] = useState('Dr. Evelyn Carter');
  const [toastMessage, setToastMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    getStaffMembers().then(members => {
      if (members && members.length > 0) {
        const names = members.map(m => m.full_name || m.email.split('@')[0]);
        setCounselorsList(names);
        if (names.length > 0) {
          setAdvisorName(names[0]);
        }
      }
    }).catch(() => {});
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !user) return;

    try {
      setIsSubmitting(true);
      const computedEnd = computeEndTime(startTime);
      await addMeeting({
        student_id: user.id,
        subject,
        scheduled_date: scheduledDate,
        start_time: startTime,
        end_time: computedEnd,
        advisor_name: advisorName,
      });

      setShowBookModal(false);
      showToast(`Advisory session "${subject}" scheduled successfully!`);
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to schedule meeting'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const meetings = dbMeetings.map(m => ({
    id: m.id,
    subject: m.subject,
    date: new Date(m.scheduled_date || Date.now()).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    time: `${m.start_time || '10:00 AM'} - ${m.end_time || computeEndTime(m.start_time || '10:00 AM')}`,
    advisor: m.advisor_name || 'Academic Advisor',
    status: m.status || 'Scheduled',
    active: m.status === 'Scheduled' || m.status === 'Rescheduled' || (m.status as string) === 'Confirmed',
  }));

  const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="space-y-6 text-left relative min-h-[600px]">

      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#6A1B2E] text-white px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1.5 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#6A1B2E]/5 text-[#6A1B2E] flex items-center justify-center">
              <CalendarIcon className="w-5 h-5" />
            </span>
            Meetings & Advisory Center
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            Book and join 1-on-1 advisory sessions, document verification checks, and visa guidance.
          </p>
        </div>

        <button
          onClick={() => setShowBookModal(true)}
          className="flex items-center gap-2 h-9.5 px-4 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#521221] transition-all shadow-sm self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Book Advisory Meeting
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Calendar Widget */}
        <Card className="lg:col-span-2 p-6 select-none border border-slate-200/80">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              Advisory Planner • {monthNames[currentMonth]} {currentYear}
            </h3>
            <div className="flex items-center gap-1.5">
              <button onClick={handlePrevMonth} className="p-1 rounded hover:bg-slate-50 border border-slate-200 text-slate-400">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={handleNextMonth} className="p-1 rounded hover:bg-slate-50 border border-slate-200 text-slate-400">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-extrabold text-slate-400 uppercase mb-2">
            <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-700">
            {Array.from({ length: startDayOfWeek }).map((_, idx) => (
              <span key={`off-${idx}`} className="h-10" />
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();
              const isMeeting = dbMeetings.some(m => {
                const d = new Date(m.scheduled_date);
                return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
              });

              return (
                <div
                  key={day}
                  className={`h-10 rounded-lg flex flex-col items-center justify-center relative cursor-pointer border ${
                    isToday
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : isMeeting
                      ? 'border-[#6A1B2E] bg-[#6A1B2E]/5 font-bold text-[#6A1B2E] hover:bg-[#6A1B2E]/10'
                      : 'border-slate-100 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span>{day}</span>
                  {isMeeting && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6A1B2E] absolute bottom-1" />
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Meeting List */}
        <div className="space-y-4">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest pl-1 mb-3">Scheduled Advisory</h3>
          
          {loading ? (
            <div className="py-8 text-center text-xs font-bold text-slate-400">Loading meetings...</div>
          ) : meetings.length === 0 ? (
            <div className="bg-white border border-slate-200/70 rounded-2xl p-8 text-center shadow-xs">
              <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No Advisory Sessions Scheduled</p>
              <button
                onClick={() => setShowBookModal(true)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-extrabold text-[#6A1B2E] hover:underline"
              >
                + Book your first meeting
              </button>
            </div>
          ) : (
            meetings.map((meet) => {
              const isCompleted = meet.status === 'Completed';

              return (
                <Card key={meet.id} className={`p-5 flex flex-col justify-between select-none ${meet.active ? 'border-l-4 border-l-[#6A1B2E]' : 'border-slate-100'}`}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{meet.date}</span>
                      <span className={`text-[9px] uppercase font-extrabold px-2 py-0.5 border rounded-full ${
                        isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {meet.status}
                      </span>
                    </div>

                    <h4 className="text-xs font-extrabold text-slate-900 leading-snug">{meet.subject}</h4>

                    <div className="space-y-1.5 text-xs text-slate-500 font-semibold pt-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{meet.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[200px]">{meet.advisor}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-4">
                    {meet.active && (
                      <Button
                        size="sm"
                        className="flex-1 text-xs font-bold h-9 flex items-center justify-center gap-1.5 shadow-none"
                        onClick={() => setActiveCallSubject(meet.subject)}
                      >
                        <Video className="w-4 h-4" /> Join Call
                      </Button>
                    )}
                    <button
                      onClick={() => handleDeleteCall(meet.id, meet.subject)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200/80 transition-all"
                      title="Cancel & Delete Scheduled Call"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Book Meeting Modal */}
      <AnimatePresence>
        {showBookModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowBookModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 z-10">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <h3 className="text-base font-black text-slate-900">Book Advisory Session</h3>
                <button onClick={() => setShowBookModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleBookSubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Meeting Agenda / Subject</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                  >
                    <option value="Visa & Embassy Guidance Session">Visa & Embassy Guidance Session</option>
                    <option value="Document Legalization & Transcripts Review">Document Legalization & Transcripts Review</option>
                    <option value="University Course Choice Counseling">University Course Choice Counseling</option>
                    <option value="Financial Proof & Bank Loan Assistance">Financial Proof & Bank Loan Assistance</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Preferred Date</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      min={getLocalDateString()}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Preferred Time</label>
                    <select
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                    >
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="11:30 AM">11:30 AM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="04:30 PM">04:30 PM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Assigned Counselor</label>
                  <select
                    value={advisorName}
                    onChange={(e) => setAdvisorName(e.target.value)}
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                  >
                    {counselorsList.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setShowBookModal(false)} className="h-9 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="h-9 px-5 bg-[#6A1B2E] text-white rounded-xl text-xs font-bold hover:bg-[#521221] shadow-xs">
                    {isSubmitting ? 'Booking...' : 'Confirm Advisory Meeting'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Video Call Modal */}
      <AnimatePresence>
        {activeCallSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[520px]">
              <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white">{activeCallSubject}</h3>
                  <p className="text-[10px] font-semibold text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Video Connection Connected
                  </p>
                </div>
              </div>

              <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 relative bg-slate-950">
                <div className="bg-slate-900 rounded-2xl flex items-center justify-center relative border border-slate-800">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#6A1B2E] text-white font-black text-xl flex items-center justify-center mx-auto mb-2 shadow-lg">EC</div>
                    <span className="text-xs font-extrabold text-white">Dr. Evelyn Carter</span>
                    <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">Academic Lead Advisor</span>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-2xl flex items-center justify-center relative border border-slate-800 overflow-hidden">
                  {!videoOff ? (
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-black text-xl flex items-center justify-center mx-auto mb-2 shadow-lg">YOU</div>
                      <span className="text-xs font-extrabold text-white">Your Video Feed</span>
                    </div>
                  ) : (
                    <div className="text-slate-500 text-xs font-bold">Camera Turned Off</div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-3">
                <button onClick={() => setMicMuted(!micMuted)} className={`p-3 rounded-full ${micMuted ? 'bg-red-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
                  {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button onClick={() => setVideoOff(!videoOff)} className={`p-3 rounded-full ${videoOff ? 'bg-red-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
                  {videoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
                <button onClick={() => setActiveCallSubject(null)} className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold text-xs flex items-center gap-1.5 px-5 shadow-md">
                  <PhoneOff className="w-5 h-5" /> End Call
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
