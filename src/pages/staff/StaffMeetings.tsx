import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon, Video, Plus, CheckCircle2, Clock,
  Search, ChevronLeft, ChevronRight, X, AlertCircle,
  FileText, Sparkles, Mic, MicOff, VideoOff, PhoneOff
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useMeetings } from '../../hooks/useMeetings';
import { useStudents } from '../../hooks/useStudents';
import { computeEndTime } from '../../lib/api/meetings';
import type { Meeting } from '../../lib/types';

export const StaffMeetings: React.FC = () => {
  const { user, profile } = useAuth();
  const { meetings, loading: meetingsLoading, addMeeting, changeStatus, deleteCall } = useMeetings();
  const { students, loading: studentsLoading } = useStudents();

  const counselorName = profile?.full_name || user?.email?.split('@')[0] || 'Admissions Counselor';
  const counselorInitials = counselorName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'FX';

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Scheduled' | 'Completed' | 'Cancelled'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [completingMeeting, setCompletingMeeting] = useState<Meeting | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [reschedulingMeeting, setReschedulingMeeting] = useState<Meeting | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('10:00 AM');

  // Video Call Simulation
  const [activeVideoCall, setActiveVideoCall] = useState<Meeting | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [callTimer, setCallTimer] = useState('00:00');

  // Schedule Modal State
  const [scheduleStudentId, setScheduleStudentId] = useState('');
  const [scheduleSubject, setScheduleSubject] = useState('Admissions & Visa Strategy Consultation');
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60 * 1000).toISOString().split('T')[0];
  });
  const [scheduleTime, setScheduleTime] = useState('10:00 AM');
  const [schedulePlatform, setSchedulePlatform] = useState<'Google Meet' | 'Zoom' | 'In-Person'>('Google Meet');
  const [scheduleLink, setScheduleLink] = useState('https://meet.google.com/fer-counselor-desk');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

  // Calendar State
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const startDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();

  const handlePrevMonth = () => {
    setCalendarMonth(prev => {
      if (prev === 0) {
        setCalendarYear(y => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setCalendarMonth(prev => {
      if (prev === 11) {
        setCalendarYear(y => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Assigned students of this counselor
  const myAssignedStudents = useMemo(() => {
    return students.filter(s =>
      s.assigned_counselor && (
        s.assigned_counselor === counselorName ||
        s.assigned_counselor.toLowerCase().includes(user?.email?.split('@')[0]?.toLowerCase() || '___')
      )
    );
  }, [students, counselorName, user?.email]);

  // Set default student for scheduling
  React.useEffect(() => {
    if (students.length > 0 && !scheduleStudentId) {
      const defaultStudent = myAssignedStudents.length > 0 ? myAssignedStudents[0].id : students[0].id;
      setScheduleStudentId(defaultStudent);
    }
  }, [students, myAssignedStudents, scheduleStudentId]);

  // Filter meetings
  const filteredMeetings = useMemo(() => {
    return meetings.filter(m => {
      // Tab filter
      if (activeTab === 'my') {
        const isDirectAdvisor = m.advisor_name && (
          m.advisor_name === counselorName ||
          m.advisor_name.toLowerCase().includes(counselorName.toLowerCase()) ||
          m.advisor_name.toLowerCase().includes(user?.email?.split('@')[0]?.toLowerCase() || '___')
        );
        const isAssignedStudentMeeting = myAssignedStudents.some(s => s.id === m.student_id);
        if (!isDirectAdvisor && !isAssignedStudentMeeting && profile?.role === 'counselor') {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'All') {
        if (m.status !== statusFilter) return false;
      }

      // Date filter from calendar selection
      if (selectedDateFilter) {
        if (m.scheduled_date !== selectedDateFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const subMatch = m.subject?.toLowerCase().includes(q);
        const advMatch = m.advisor_name?.toLowerCase().includes(q);
        const stuMatch = (m as any).users?.full_name?.toLowerCase().includes(q) || (m as any).users?.email?.toLowerCase().includes(q);
        if (!subMatch && !advMatch && !stuMatch) return false;
      }

      return true;
    });
  }, [meetings, activeTab, statusFilter, selectedDateFilter, searchQuery, counselorName, user?.email, myAssignedStudents, profile?.role]);

  // Summary counts
  const pendingCount = meetings.filter(m => m.status === 'Scheduled' || m.status === 'Rescheduled').length;
  const completedCount = meetings.filter(m => m.status === 'Completed').length;

  // Handle Complete Meeting
  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingMeeting) return;

    try {
      await changeStatus(completingMeeting.id, 'Completed', {
        notes: completionNotes || completingMeeting.notes || 'Advisory session concluded successfully.'
      });
      showToast(`Meeting "${completingMeeting.subject}" marked as Completed!`);
      setCompletingMeeting(null);
      setCompletionNotes('');
      if (activeVideoCall?.id === completingMeeting.id) {
        setActiveVideoCall(null);
      }
    } catch (err: any) {
      showToast(`Error completing session: ${err.message}`);
    }
  };

  // Handle Reschedule
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingMeeting || !rescheduleDate) return;

    try {
      const computedEnd = computeEndTime(rescheduleTime);
      await changeStatus(reschedulingMeeting.id, 'Rescheduled', {
        scheduled_date: rescheduleDate,
        start_time: rescheduleTime,
        end_time: computedEnd
      });
      showToast(`Meeting rescheduled to ${rescheduleDate} at ${rescheduleTime}`);
      setReschedulingMeeting(null);
    } catch (err: any) {
      showToast(`Error rescheduling: ${err.message}`);
    }
  };

  // Handle Schedule Consultation
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleStudentId || !scheduleSubject.trim()) return;

    try {
      setIsSubmittingSchedule(true);
      const computedEnd = computeEndTime(scheduleTime);
      await addMeeting({
        student_id: scheduleStudentId,
        subject: scheduleSubject.trim(),
        advisor_name: counselorName,
        scheduled_date: scheduleDate,
        start_time: scheduleTime,
        end_time: computedEnd,
        meeting_link: scheduleLink,
        notes: scheduleNotes || `Scheduled by ${counselorName} for student advisory.`,
      });

      showToast(`Consultation session scheduled successfully!`);
      setShowScheduleModal(false);
      setScheduleSubject('Admissions & Visa Strategy Consultation');
      setScheduleNotes('');
    } catch (err: any) {
      showToast(`Error scheduling meeting: ${err.message}`);
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  return (
    <div className="space-y-6 text-left antialiased select-none min-h-[600px]">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-white/20"
          >
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#6A1B2E] via-[#521221] to-[#3B0B16] text-white p-7 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase bg-white/20 text-white px-3 py-1 rounded-full border border-white/20 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-amber-300" /> Counselor Session Desk
              </span>
              <span className="text-[10px] font-bold text-emerald-300">● Live Audio/Video Hub</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">
              Student Consultation Workspace
            </h1>
            <p className="text-xs text-white/70 font-semibold leading-relaxed">
              Conduct scheduled video sessions, log post-call consultation notes, and finalize student advisory milestones.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              size="sm"
              className="bg-white text-[#6A1B2E] hover:bg-slate-100 font-black text-xs h-10 px-4 cursor-pointer"
              onClick={() => setShowScheduleModal(true)}
            >
              <Plus className="w-4 h-4 mr-1.5 text-[#6A1B2E]" /> Schedule Session
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Upcoming Consultations', val: `${pendingCount} Scheduled`, sub: 'Pending student calls', color: 'text-blue-700', bg: 'bg-blue-500' },
          { label: 'Completed Sessions', val: `${completedCount} Attended`, sub: 'Advisory logged', color: 'text-emerald-700', bg: 'bg-emerald-500' },
          { label: 'My Assigned Students', val: `${myAssignedStudents.length} Active`, sub: 'Dedicated files', color: 'text-amber-700', bg: 'bg-amber-500' },
          { label: 'Total Team Meetings', val: `${meetings.length} Total`, sub: 'Education portal', color: 'text-[#6A1B2E]', bg: 'bg-[#6A1B2E]' },
        ].map((kpi, idx) => (
          <Card key={idx} className="p-4 border border-slate-200/70 shadow-xs space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">{kpi.label}</span>
            <div className={`text-xl font-black ${kpi.color}`}>{kpi.val}</div>
            <span className="text-[10px] font-semibold text-slate-400 block">{kpi.sub}</span>
          </Card>
        ))}
      </div>

      {/* Controls & Tab Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'my'
                ? 'bg-[#6A1B2E] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            My Sessions ({filteredMeetings.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'all'
                ? 'bg-[#6A1B2E] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Department Sessions ({meetings.length})
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student or subject..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
          >
            <option value="All">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {selectedDateFilter && (
            <button
              onClick={() => setSelectedDateFilter(null)}
              className="px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1 hover:bg-rose-100"
            >
              Clear Date ({selectedDateFilter}) <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Meeting Cards + Interactive Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Meeting Cards */}
        <div className="lg:col-span-2 space-y-4">
          {meetingsLoading || studentsLoading ? (
            <Card className="p-12 text-center text-xs font-bold text-slate-400 border border-slate-200/80">
              Loading consultation sessions from database...
            </Card>
          ) : filteredMeetings.length === 0 ? (
            <Card className="p-12 text-center space-y-3 border border-slate-200/80 bg-slate-50/50">
              <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800">No Consultation Sessions Found</h3>
                <p className="text-xs font-semibold text-slate-500">
                  {selectedDateFilter
                    ? `No meetings scheduled for ${selectedDateFilter}.`
                    : activeTab === 'my'
                    ? 'You have no assigned consultation calls matching the filter.'
                    : 'No consultation records available in the education desk.'}
                </p>
              </div>
              <Button
                size="sm"
                className="bg-[#6A1B2E] text-white text-xs font-bold"
                onClick={() => setShowScheduleModal(true)}
              >
                <Plus className="w-4 h-4 mr-1" /> Schedule Consultation Call
              </Button>
            </Card>
          ) : (
            filteredMeetings.map(m => {
              const isCompleted = m.status === 'Completed';
              const isCancelled = m.status === 'Cancelled';
              const studentObj = (m as any).users || students.find(s => s.id === m.student_id);
              const studentName = studentObj?.full_name || (m as any).student_name || 'Student';
              const studentEmail = studentObj?.email || '—';
              const timeSlot = `${m.start_time || '10:00 AM'} - ${m.end_time || computeEndTime(m.start_time || '10:00 AM')}`;

              return (
                <Card
                  key={m.id}
                  className={`p-5 border transition-all space-y-4 text-left ${
                    isCompleted
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : isCancelled
                      ? 'border-rose-200 bg-rose-50/20 opacity-70'
                      : 'border-slate-200/80 shadow-xs hover:shadow-md'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase text-[#6A1B2E] bg-[#6A1B2E]/5 px-2 py-0.5 rounded-md border border-[#6A1B2E]/10">
                          {m.scheduled_date || 'Today'} • {timeSlot}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9.5px] font-black ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : isCancelled
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          ● {m.status || 'Scheduled'}
                        </span>
                      </div>
                      <h3 className="text-sm font-black text-slate-900">{m.subject || 'Student Consultation Session'}</h3>
                      <p className="text-xs font-semibold text-slate-500">
                        Student: <span className="font-extrabold text-slate-800">{studentName}</span> ({studentEmail})
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {!isCompleted && !isCancelled && (
                        <>
                          <Button
                            size="sm"
                            className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold h-8"
                            onClick={() => {
                              setActiveVideoCall(m);
                              setCallTimer('00:00');
                            }}
                          >
                            <Video className="w-3.5 h-3.5 mr-1" /> Join Call
                          </Button>

                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8"
                            onClick={() => {
                              setCompletingMeeting(m);
                              setCompletionNotes(m.notes || '');
                            }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Complete Meeting
                          </Button>
                        </>
                      )}

                      {isCompleted && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/70 px-3 py-1.5 rounded-xl border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Milestone Completed
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Consultation Notes & Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                      <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Admissions Advisor</span>
                      <span className="font-black text-slate-900">{m.advisor_name || counselorName}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                      <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Session Notes & Action Items</span>
                      <span className="font-bold text-slate-700 line-clamp-2">
                        {m.notes || 'Document verification, SOP structure review, and visa eligibility consultation.'}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  {!isCompleted && !isCancelled && (
                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 text-xs font-bold">
                      <button
                        onClick={() => {
                          setReschedulingMeeting(m);
                          setRescheduleDate(m.scheduled_date || '');
                          setRescheduleTime(m.start_time || '10:00 AM');
                        }}
                        className="text-[#6A1B2E] hover:underline"
                      >
                        Reschedule Session
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to cancel the meeting "${m.subject}"?`)) {
                            changeStatus(m.id, 'Cancelled');
                            showToast('Session cancelled.');
                          }
                        }}
                        className="text-rose-600 hover:underline"
                      >
                        Cancel Call
                      </button>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>

        {/* Right Column: Dynamic Interactive Calendar & Quick Actions */}
        <div className="space-y-6">
          {/* Interactive Calendar Widget */}
          <Card className="p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                {monthNames[calendarMonth]} {calendarYear}
              </h3>
              <div className="flex items-center gap-1">
                <button onClick={handlePrevMonth} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={handleNextMonth} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-slate-400 mb-1">
              <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-700">
              {Array.from({ length: startDayOfWeek }).map((_, idx) => (
                <span key={`empty-${idx}`} className="h-8" />
              ))}

              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const dayStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const hasMeetings = meetings.some(m => m.scheduled_date === dayStr);
                const isSelected = selectedDateFilter === dayStr;
                const isToday = dayStr === new Date().toISOString().split('T')[0];

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDateFilter(isSelected ? null : dayStr)}
                    className={`h-8 rounded-lg flex flex-col items-center justify-center relative font-bold text-xs transition-all ${
                      isSelected
                        ? 'bg-[#6A1B2E] text-white shadow-xs font-black'
                        : isToday
                        ? 'bg-slate-900 text-white font-black'
                        : hasMeetings
                        ? 'bg-amber-100 text-amber-900 font-extrabold hover:bg-amber-200'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>{day}</span>
                    {hasMeetings && !isSelected && !isToday && (
                      <span className="w-1 h-1 rounded-full bg-[#6A1B2E] absolute bottom-1" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="text-[10px] font-semibold text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Scheduled Date</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-900" /> Today</span>
            </div>
          </Card>

          {/* Assigned Students Quick Roster */}
          <Card className="p-5 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
              My Assigned Students ({myAssignedStudents.length})
            </h3>
            {myAssignedStudents.length === 0 ? (
              <p className="text-xs font-semibold text-slate-400 py-3 text-center">No students currently assigned to your desk.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 divide-y divide-slate-100">
                {myAssignedStudents.map(st => (
                  <div key={st.id} className="pt-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-900 truncate">{st.full_name || st.email.split('@')[0]}</h4>
                      <p className="text-[10px] text-slate-400 truncate">{st.email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[10px] font-black h-7 px-2 shrink-0 cursor-pointer"
                      onClick={() => {
                        setScheduleStudentId(st.id);
                        setShowScheduleModal(true);
                      }}
                    >
                      Book Call
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Complete Meeting Modal */}
      <AnimatePresence>
        {completingMeeting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setCompletingMeeting(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 z-10 text-left space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Complete Consultation Session</h3>
                    <p className="text-[10px] text-slate-500 font-semibold">Finalize call & complete student counseling stage</p>
                  </div>
                </div>
                <button onClick={() => setCompletingMeeting(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs font-semibold text-emerald-900">
                <span className="font-black block">{completingMeeting.subject}</span>
                <span className="text-[11px] text-emerald-700 block mt-0.5">
                  Student: {(completingMeeting as any).users?.full_name || 'Assigned Student'}
                </span>
              </div>

              <form onSubmit={handleCompleteSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Counselor Notes & Next Steps Recommendation
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={completionNotes}
                    onChange={e => setCompletionNotes(e.target.value)}
                    placeholder="Enter key discussion takeaways, student document verification results, or recommended program applications..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl text-[10.5px] text-slate-500 font-medium leading-relaxed">
                  💡 <strong>Automated Action:</strong> Marking this completed will immediately advance the student's <strong>Stage 2 (Counselling)</strong> milestone in the Journey Tracker.
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setCompletingMeeting(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs">
                    Confirm & Complete Stage
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Schedule Consultation Modal */}
      <AnimatePresence>
        {showScheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setShowScheduleModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 z-10 text-left space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center">
                    <CalendarIcon className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Schedule Student Consultation Call</h3>
                    <p className="text-[10px] text-slate-500 font-semibold">Book a 1-on-1 counseling appointment</p>
                  </div>
                </div>
                <button onClick={() => setShowScheduleModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleScheduleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Select Student
                  </label>
                  <select
                    required
                    value={scheduleStudentId}
                    onChange={e => setScheduleStudentId(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                  >
                    {students.map(st => (
                      <option key={st.id} value={st.id}>
                        {st.full_name || st.email.split('@')[0]} ({st.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Meeting Subject / Agenda
                  </label>
                  <input
                    type="text"
                    required
                    value={scheduleSubject}
                    onChange={e => setScheduleSubject(e.target.value)}
                    placeholder="e.g. European University Shortlisting & SOP Consultation"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Date</label>
                    <input
                      type="date"
                      required
                      value={scheduleDate}
                      onChange={e => setScheduleDate(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Time</label>
                    <select
                      value={scheduleTime}
                      onChange={e => setScheduleTime(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                    >
                      <option value="09:30 AM">09:30 AM</option>
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="11:30 AM">11:30 AM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="03:30 PM">03:30 PM</option>
                      <option value="04:30 PM">04:30 PM</option>
                      <option value="06:00 PM">06:00 PM</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Platform</label>
                    <select
                      value={schedulePlatform}
                      onChange={e => setSchedulePlatform(e.target.value as any)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                    >
                      <option value="Google Meet">Google Meet</option>
                      <option value="Zoom">Zoom Video</option>
                      <option value="In-Person">In-Person Office Desk</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Meeting Link / Room</label>
                    <input
                      type="text"
                      value={scheduleLink}
                      onChange={e => setScheduleLink(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Agenda / Preparation Notes</label>
                  <textarea
                    rows={2}
                    value={scheduleNotes}
                    onChange={e => setScheduleNotes(e.target.value)}
                    placeholder="Provide any instructions or documents for the student to bring to the call..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowScheduleModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmittingSchedule} size="sm" className="bg-[#6A1B2E] text-white font-black text-xs">
                    {isSubmittingSchedule ? 'Scheduling...' : 'Schedule Call & Notify Student'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reschedule Modal */}
      <AnimatePresence>
        {reschedulingMeeting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setReschedulingMeeting(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 z-10 text-left space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">Reschedule Consultation</h3>
                <button onClick={() => setReschedulingMeeting(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRescheduleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">New Date</label>
                  <input
                    type="date"
                    required
                    value={rescheduleDate}
                    onChange={e => setRescheduleDate(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">New Time</label>
                  <select
                    value={rescheduleTime}
                    onChange={e => setRescheduleTime(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                  >
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="11:30 AM">11:30 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="03:30 PM">03:30 PM</option>
                    <option value="04:30 PM">04:30 PM</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setReschedulingMeeting(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-[#6A1B2E] text-white font-black text-xs">
                    Confirm Reschedule
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Live Video Room Simulator */}
      <AnimatePresence>
        {activeVideoCall && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[560px]">
              <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white">{activeVideoCall.subject}</h3>
                  <p className="text-[10px] font-semibold text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Consultation Room • Time in Session: {callTimer}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs"
                    onClick={() => {
                      setCompletingMeeting(activeVideoCall);
                      setCompletionNotes(activeVideoCall.notes || '');
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Finish & Log Meeting
                  </Button>
                </div>
              </div>

              <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 relative bg-slate-950">
                {/* Counselor Feed */}
                <div className="bg-slate-900 rounded-2xl flex items-center justify-center relative border border-slate-800 overflow-hidden">
                  {!videoOff ? (
                    <div className="text-center space-y-2">
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#6A1B2E] to-[#4A101E] text-amber-300 font-black text-2xl flex items-center justify-center mx-auto shadow-xl border border-rose-800/40">
                        {counselorInitials}
                      </div>
                      <span className="text-xs font-extrabold text-white block">{counselorName}</span>
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-full inline-block">
                        Admissions Advisor (You)
                      </span>
                    </div>
                  ) : (
                    <div className="text-slate-500 text-xs font-bold">Your Camera is Muted</div>
                  )}
                </div>

                {/* Student Feed */}
                <div className="bg-slate-900 rounded-2xl flex items-center justify-center relative border border-slate-800 overflow-hidden">
                  <div className="text-center space-y-2">
                    <div className="w-20 h-20 rounded-3xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-xl">
                      {((activeVideoCall as any).users?.full_name || 'Student').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-extrabold text-white block">
                      {(activeVideoCall as any).users?.full_name || 'Assigned Student'}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full inline-block">
                      ● Active Audio Feed Connected
                    </span>
                  </div>
                </div>
              </div>

              {/* Call Controls */}
              <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
                <div className="text-xs text-slate-400 font-semibold">
                  Link: <span className="text-slate-200">{activeVideoCall.meeting_link || 'Google Meet'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setMicMuted(!micMuted)} className={`p-3 rounded-full transition-all ${micMuted ? 'bg-red-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
                    {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setVideoOff(!videoOff)} className={`p-3 rounded-full transition-all ${videoOff ? 'bg-red-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
                    {videoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setActiveVideoCall(null)} className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold text-xs flex items-center gap-1.5 px-5 shadow-md cursor-pointer">
                    <PhoneOff className="w-4 h-4" /> Exit Room
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
