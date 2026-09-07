import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Video, Search, Trash2, CalendarCheck, AlertTriangle, X, Plus, Mic, MicOff, VideoOff, PhoneOff, Activity, CheckCircle2, List, BarChart3, ChevronLeft, ChevronRight, Clock, User, MapPin } from 'lucide-react';
import { Card } from '../../components/Card';
import { useMeetings } from '../../hooks/useMeetings';
import { computeEndTime } from '../../lib/api/meetings';
import { getStudents, getStaffMembers } from '../../lib/api/students';

export const AdminMeetings: React.FC = () => {
  const { meetings: dbMeetings, changeStatus, deleteCall, loading, addMeeting } = useMeetings();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [advisorFilter, setAdvisorFilter] = useState('All');
  const [toastMessage, setToastMessage] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'calendar' | 'control' | 'workload'>('calendar');

  // Local Date Helper to avoid UTC offset bugs
  const getLocalDateString = (d: Date = new Date()) => {
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split('T')[0];
  };

  // Calendar States
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-indexed
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(getLocalDateString());

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

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedCalendarDate(getLocalDateString(now));
  };

  // Reschedule States
  const [rescheduleMtgId, setRescheduleMtgId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState(getLocalDateString());
  const [newTime, setNewTime] = useState('10:00 AM');

  // Book Meeting from Admin States
  const [showBookModal, setShowBookModal] = useState(false);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [counselorsList, setCounselorsList] = useState<string[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [bookSubject, setBookSubject] = useState('Visa & Embassy Guidance Session');
  const [bookDate, setBookDate] = useState(getLocalDateString());
  const [bookTime, setBookTime] = useState('10:00 AM');
  const [bookAdvisor, setBookAdvisor] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookMode, setBookMode] = useState<'Online' | 'In-Person'>('Online');
  const [bookLink, setBookLink] = useState('https://meet.google.com/fer-exed-app');
  const [bookLocation, setBookLocation] = useState('Ferex Head Office - Cabin A');
  const [bookNotes, setBookNotes] = useState('');

  // Video call states
  const [activeCallMeeting, setActiveCallMeeting] = useState<any | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  React.useEffect(() => {
    getStudents().then(students => {
      setStudentsList(students);
      if (students.length > 0 && !selectedStudentId) setSelectedStudentId(students[0].id);
    }).catch(() => { });

    getStaffMembers().then(staff => {
      if (staff && staff.length > 0) {
        const names = staff.map(s => s.full_name || (s.email ? s.email.split('@')[0] : 'Advisor')).filter(Boolean);
        const uniqueNames = Array.from(new Set(names));
        setCounselorsList(uniqueNames);
        if (uniqueNames.length > 0 && !bookAdvisor) setBookAdvisor(uniqueNames[0]);
      } else {
        const defaults = ['Sarah Jenkins', 'David Wilson', 'Elena Rostova', 'Academic Advisor'];
        setCounselorsList(defaults);
        if (!bookAdvisor) setBookAdvisor(defaults[0]);
      }
    }).catch(() => {
      const defaults = ['Sarah Jenkins', 'David Wilson', 'Elena Rostova', 'Academic Advisor'];
      setCounselorsList(defaults);
      if (!bookAdvisor) setBookAdvisor(defaults[0]);
    });
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleStatusChange = async (id: string, status: 'Scheduled' | 'Rescheduled' | 'Completed' | 'Cancelled') => {
    try {
      await changeStatus(id, status);
      showToast(`Meeting status updated to ${status}.`);
    } catch (err: any) {
      showToast(`Error updating status: ${err.message || 'Failed'}`);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleMtgId) return;
    try {
      const calculatedEnd = computeEndTime(newTime);
      await changeStatus(rescheduleMtgId, 'Rescheduled', {
        scheduled_date: newDate,
        start_time: newTime,
        end_time: calculatedEnd,
      });
      showToast('Meeting rescheduled and confirmed successfully.');
      setRescheduleMtgId(null);
    } catch (err: any) {
      showToast(`Error rescheduling: ${err.message || 'Failed'}`);
    }
  };

  const handleAdminBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      showToast('Please select a student.');
      return;
    }
    try {
      setIsBooking(true);
      const computedEnd = computeEndTime(bookTime);
      await addMeeting({
        student_id: selectedStudentId,
        subject: bookSubject,
        scheduled_date: bookDate,
        start_time: bookTime,
        end_time: computedEnd,
        advisor_name: bookAdvisor,
        meeting_link: bookMode === 'Online' ? bookLink.trim() : `In-Person: ${bookLocation.trim()}`,
        notes: bookNotes.trim(),
      });
      showToast('Advisory meeting scheduled successfully!');
      setShowBookModal(false);
      setBookNotes('');
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to book meeting'}`);
    } finally {
      setIsBooking(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await deleteCall(deleteId);
      showToast('Meeting cancelled and deleted.');
      setDeleteId(null);
    } catch (err: any) {
      showToast(`Error deleting meeting: ${err.message || 'Failed'}`);
    }
  };

  // Process and filter meetings with rich student resolution
  const meetings = dbMeetings.map(m => {
    const studentObj = studentsList.find(s => s.id === m.student_id) || (m as any).users;
    const rawDate = m.scheduled_date || (m as any).created_at || getLocalDateString();
    // Normalize date to YYYY-MM-DD
    const isoDateStr = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;

    return {
      id: m.id,
      rawMeeting: m,
      subject: m.subject || (m as any).title || 'Advisory Session',
      studentId: m.student_id,
      studentName: studentObj?.full_name || (m as any).student_name || (m as any).users?.full_name || 'Enrolled Student',
      studentEmail: studentObj?.email || (m as any).student_email || (m as any).users?.email || 'student@ferex.com',
      dateKey: isoDateStr,
      date: new Date(rawDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      time: `${m.start_time || '10:00 AM'} - ${m.end_time || computeEndTime(m.start_time || '10:00 AM')}`,
      startTime: m.start_time || '10:00 AM',
      advisor: m.advisor_name || 'Academic Advisor',
      status: m.status || 'Scheduled',
      meetingLink: m.meeting_link || (m as any).meet_link || 'https://meet.google.com/fer-exed-app',
      notes: m.notes || (m as any).description || '',
    };
  });

  const filteredMeetings = meetings.filter(m => {
    const matchesSearch =
      m.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.advisor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || m.status === statusFilter;
    const matchesAdvisor = advisorFilter === 'All' || m.advisor === advisorFilter;
    return matchesSearch && matchesStatus && matchesAdvisor;
  });

  const activeCount = meetings.filter(m => ['Scheduled', 'Rescheduled', 'Confirmed'].includes(m.status)).length;
  const completedCount = meetings.filter(m => m.status === 'Completed').length;
  const cancelledCount = meetings.filter(m => m.status === 'Cancelled').length;

  const advisorWorkloads = counselorsList.map(advisorName => {
    const advisorMeetings = meetings.filter(m => m.advisor === advisorName);
    const active = advisorMeetings.filter(m => ['Scheduled', 'Rescheduled', 'Confirmed'].includes(m.status)).length;
    const completed = advisorMeetings.filter(m => m.status === 'Completed').length;
    return { name: advisorName, active, completed };
  });

  // Selected Day Meetings for Calendar
  const selectedDayMeetings = meetings.filter(m => m.dateKey === selectedCalendarDate);

  return (
    <div className="space-y-6 text-left relative min-h-[600px]">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2"
          >
            <CalendarCheck className="w-4 h-4 text-emerald-400" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1.5 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#6A1B2E]/5 text-[#6A1B2E] flex items-center justify-center">
              <CalendarIcon className="w-5 h-5" />
            </span>
            Meet Calendar & Advisory Tracker
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            Interactive calendar schedule, cross-portal counseling bookings, and advisor capacity management.
          </p>
        </div>

        <button
          onClick={() => {
            setShowBookModal(true);
            setBookDate(selectedCalendarDate || getLocalDateString());
            setBookTime('10:00 AM');
          }}
          className="flex items-center gap-2 h-9.5 px-4 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#521221] transition-all shadow-sm self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Schedule Student Meeting
        </button>
      </div>

      {/* Premium Metrics Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-50 border border-slate-200/60 p-4.5 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Active Consultations</p>
            <h3 className="text-xl font-black text-slate-950">{activeCount} Sessions</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/60 p-4.5 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Completed Sessions</p>
            <h3 className="text-xl font-black text-slate-950">{completedCount} Completed</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/60 p-4.5 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Cancellations</p>
            <h3 className="text-xl font-black text-slate-950">{cancelledCount} Cancelled</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center gap-4 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`pb-3.5 text-xs font-bold transition-all relative px-1 flex items-center gap-1.5 ${activeTab === 'calendar' ? 'text-[#6A1B2E]' : 'text-slate-400 hover:text-slate-600'
            }`}
        >
          <CalendarIcon className="w-4 h-4" /> 📅 Meet Calendar
          {activeTab === 'calendar' && <motion.div layoutId="meetingActiveTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6A1B2E]" />}
        </button>
        <button
          onClick={() => setActiveTab('control')}
          className={`pb-3.5 text-xs font-bold transition-all relative px-1 flex items-center gap-1.5 ${activeTab === 'control' ? 'text-[#6A1B2E]' : 'text-slate-400 hover:text-slate-600'
            }`}
        >
          <List className="w-4 h-4" /> 📋 Consultation Records
          {activeTab === 'control' && <motion.div layoutId="meetingActiveTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6A1B2E]" />}
        </button>
        <button
          onClick={() => setActiveTab('workload')}
          className={`pb-3.5 text-xs font-bold transition-all relative px-1 flex items-center gap-1.5 ${activeTab === 'workload' ? 'text-[#6A1B2E]' : 'text-slate-400 hover:text-slate-600'
            }`}
        >
          <BarChart3 className="w-4 h-4" /> 📊 Advisor Workloads
          {activeTab === 'workload' && <motion.div layoutId="meetingActiveTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6A1B2E]" />}
        </button>
      </div>

      {/* TAB 1: MEET CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Calendar Month Grid */}
          <div className="lg:col-span-8 space-y-4">
            <Card className="p-6 select-none border border-slate-200/80 shadow-xs bg-white">
              {/* Calendar Header Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    {monthNames[currentMonth]} {currentYear}
                  </h3>
                  <button
                    onClick={handleJumpToToday}
                    className="px-2.5 py-1 text-[11px] font-bold text-[#6A1B2E] bg-[#6A1B2E]/5 hover:bg-[#6A1B2E]/10 rounded-lg transition-colors border border-[#6A1B2E]/15"
                  >
                    Today
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* Advisor Filter Dropdown */}
                  <select
                    value={advisorFilter}
                    onChange={(e) => setAdvisorFilter(e.target.value)}
                    className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-[#6A1B2E]/40"
                  >
                    <option value="All">All Advisors</option>
                    {counselorsList.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-white">
                    <button
                      onClick={handlePrevMonth}
                      className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
                      title="Previous Month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleNextMonth}
                      className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
                      title="Next Month"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-extrabold text-slate-400 uppercase mb-2">
                <span className="text-red-400">Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Calendar Grid Cells */}
              <div className="grid grid-cols-7 gap-1.5">
                {/* Empty cells before month starts */}
                {Array.from({ length: startDayOfWeek }).map((_, idx) => (
                  <div key={`empty-start-${idx}`} className="min-h-[85px] p-1.5 rounded-xl bg-slate-50/40 border border-transparent opacity-30" />
                ))}

                {/* Days of Month */}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const dayDate = new Date(currentYear, currentMonth, day);
                  const dateKey = getLocalDateString(dayDate);
                  const isToday = dateKey === getLocalDateString(new Date());
                  const isSelected = dateKey === selectedCalendarDate;

                  // Meetings on this day (subject to advisor filter)
                  const dayMeetings = meetings.filter(m => {
                    const matchDate = m.dateKey === dateKey;
                    const matchAdv = advisorFilter === 'All' || m.advisor === advisorFilter;
                    return matchDate && matchAdv;
                  });

                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedCalendarDate(dateKey)}
                      className={`min-h-[85px] p-1.5 rounded-xl flex flex-col justify-between cursor-pointer transition-all border relative group ${
                        isSelected
                          ? 'border-[#6A1B2E] ring-2 ring-[#6A1B2E]/20 bg-[#6A1B2E]/5'
                          : isToday
                          ? 'border-blue-300 bg-blue-50/40 hover:border-blue-400'
                          : dayMeetings.length > 0
                          ? 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/70'
                          : 'border-slate-100 hover:border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-black inline-flex items-center justify-center w-5 h-5 rounded-full ${
                            isToday
                              ? 'bg-blue-600 text-white shadow-xs'
                              : isSelected
                              ? 'bg-[#6A1B2E] text-white'
                              : 'text-slate-700'
                          }`}
                        >
                          {day}
                        </span>
                        {dayMeetings.length > 0 && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            {dayMeetings.length}
                          </span>
                        )}
                      </div>

                      {/* Day meeting chips preview */}
                      <div className="space-y-1 mt-1 overflow-hidden">
                        {dayMeetings.slice(0, 2).map(m => {
                          const isCancelled = m.status === 'Cancelled';
                          const isCompleted = m.status === 'Completed';

                          return (
                            <div
                              key={m.id}
                              className={`text-[9px] font-bold truncate px-1.5 py-0.5 rounded-md border text-left ${
                                isCancelled
                                  ? 'bg-red-50 text-red-700 border-red-200 line-through'
                                  : isCompleted
                                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                                  : 'bg-[#6A1B2E]/10 text-[#6A1B2E] border-[#6A1B2E]/20'
                              }`}
                              title={`${m.startTime} - ${m.studentName} (${m.subject})`}
                            >
                              <span className="font-extrabold">{m.startTime.split(' ')[0]}</span> {m.studentName.split(' ')[0]}
                            </div>
                          );
                        })}
                        {dayMeetings.length > 2 && (
                          <div className="text-[8px] font-bold text-slate-400 pl-1">
                            +{dayMeetings.length - 2} more
                          </div>
                        )}
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-right">
                        <span className="text-[8px] font-extrabold text-[#6A1B2E]">+ slot</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Side Panel: Selected Day Agenda */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="p-5 border border-slate-200/80 shadow-xs bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Day Schedule
                  </h3>
                  <p className="text-[11px] font-bold text-[#6A1B2E] mt-0.5">
                    {new Date(selectedCalendarDate + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowBookModal(true);
                    setBookDate(selectedCalendarDate);
                    setBookTime('10:00 AM');
                  }}
                  className="h-7 px-2.5 bg-[#6A1B2E] hover:bg-[#521221] text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Book Session
                </button>
              </div>

              {selectedDayMeetings.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No Meetings on this Day</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto">
                    Click "Book Session" to schedule a 1-on-1 counseling slot for this date.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayMeetings.map((meet) => {
                    const isCompleted = meet.status === 'Completed';
                    const isActive = ['Scheduled', 'Rescheduled', 'Confirmed'].includes(meet.status);

                    return (
                      <div
                        key={meet.id}
                        className={`p-3.5 rounded-xl border text-left space-y-2.5 transition-all ${
                          isActive
                            ? 'bg-slate-50/70 border-slate-200'
                            : isCompleted
                            ? 'bg-slate-50/40 border-slate-200 opacity-80'
                            : 'bg-red-50/30 border-red-100 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-slate-900 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {meet.time}
                          </span>
                          <span
                            className={`text-[8px] uppercase font-extrabold tracking-wider px-2 py-0.5 border rounded-full ${
                              meet.status === 'Scheduled'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : meet.status === 'Rescheduled'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : meet.status === 'Completed'
                                ? 'bg-slate-100 text-slate-600 border-slate-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            {meet.status}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs font-black text-slate-900 leading-snug">{meet.subject}</h4>
                          <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mt-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {meet.studentName}
                            <span className="text-[10px] font-semibold text-slate-400">({meet.studentEmail})</span>
                          </p>
                          <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                            Advisor: <strong className="text-slate-700">{meet.advisor}</strong>
                          </p>
                        </div>

                        {meet.meetingLink.startsWith('http') ? (
                          <div className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                            <Video className="w-3 h-3 text-blue-500" />
                            Online Video Call
                          </div>
                        ) : (
                          <div className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-amber-600" />
                            {meet.meetingLink}
                          </div>
                        )}

                        {meet.notes && (
                          <p className="text-[10px] text-slate-400 italic bg-white p-2 rounded-lg border border-slate-100">
                            "{meet.notes}"
                          </p>
                        )}

                        {/* Action buttons */}
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-1.5">
                          {isActive && meet.meetingLink.startsWith('http') && (
                            <button
                              onClick={() => {
                                window.open(meet.meetingLink, '_blank');
                                setActiveCallMeeting(meet);
                              }}
                              className="h-7 px-2.5 bg-[#6A1B2E] hover:bg-[#521221] text-white text-[10px] font-bold rounded-lg shadow-xs flex items-center gap-1"
                            >
                              <Video className="w-3 h-3" /> Join
                            </button>
                          )}

                          {isActive && (
                            <button
                              onClick={() => {
                                setRescheduleMtgId(meet.id);
                                setNewDate(meet.dateKey || getLocalDateString());
                                setNewTime(meet.startTime || '10:00 AM');
                              }}
                              className="h-7 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg"
                            >
                              Reschedule
                            </button>
                          )}

                          {meet.status === 'Rescheduled' && (
                            <button
                              onClick={() => handleStatusChange(meet.id, 'Completed')}
                              className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg"
                            >
                              Complete
                            </button>
                          )}

                          {isActive && (
                            <button
                              onClick={() => handleStatusChange(meet.id, 'Cancelled')}
                              className="h-7 px-2 text-red-600 hover:bg-red-50 text-[10px] font-bold rounded-lg border border-red-100"
                            >
                              Cancel
                            </button>
                          )}

                          <button
                            onClick={() => setDeleteId(meet.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors ml-auto"
                            title="Delete record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED CONSULTATION RECORDS TABLE */}
      {activeTab === 'control' && (
        <>
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 border border-slate-200/80 rounded-2xl shadow-xs">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search meetings by student, subject, or advisor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9.5 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto self-stretch overflow-x-auto pb-1 sm:pb-0">
              {['All', 'Scheduled', 'Rescheduled', 'Completed', 'Cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`h-9 px-3.5 rounded-xl text-xs font-bold transition-all border shrink-0 ${statusFilter === status
                      ? 'bg-[#6A1B2E] text-white border-[#6A1B2E] shadow-sm'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Table of Meetings */}
          {loading && filteredMeetings.length === 0 ? (
            <div className="py-24 text-center text-xs font-bold text-slate-400">Loading scheduled advisory meetings...</div>
          ) : filteredMeetings.length === 0 ? (
            <Card className="p-16 text-center border border-slate-200/80 w-full bg-white">
              <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-black text-slate-800">No Advisory Meetings Found</h3>
              <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm mx-auto">
                Try adjusting your search query or filters to locate scheduled student meetings.
              </p>
            </Card>
          ) : (
            <div className="bg-white border border-slate-200/85 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      <th className="px-5 py-3">Student</th>
                      <th className="px-5 py-3">Subject / Agenda</th>
                      <th className="px-5 py-3">Scheduled Slot</th>
                      <th className="px-5 py-3">Advisor</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-600">
                    {filteredMeetings.map((meet) => {
                      const statusColors = {
                        Scheduled: 'bg-blue-50 text-blue-700 border-blue-100',
                        Rescheduled: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                        Completed: 'bg-slate-50 text-slate-600 border-slate-200',
                        Cancelled: 'bg-red-50 text-red-700 border-red-100',
                      }[meet.status] || 'bg-slate-50 text-slate-600 border-slate-200';

                      return (
                        <tr key={meet.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="px-5 py-3.5">
                            <span className="block text-slate-900 font-extrabold">{meet.studentName}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{meet.studentEmail}</span>
                          </td>
                          <td className="px-5 py-3.5 max-w-[200px] truncate">{meet.subject}</td>
                          <td className="px-5 py-3.5">
                            <span className="block text-slate-800">{meet.date}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{meet.time}</span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-700">{meet.advisor}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-block text-[8px] uppercase font-extrabold tracking-wider px-2 py-0.5 border rounded-full ${statusColors}`}>
                              {meet.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {meet.status === 'Scheduled' && (
                                <button
                                  onClick={() => {
                                    setRescheduleMtgId(meet.id);
                                    setNewDate(meet.dateKey || getLocalDateString());
                                    setNewTime(meet.startTime || '10:00 AM');
                                  }}
                                  className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg shadow-sm transition-all"
                                >
                                  Reschedule
                                </button>
                              )}
                              {meet.status === 'Rescheduled' && (
                                <button
                                  onClick={() => handleStatusChange(meet.id, 'Completed')}
                                  className="h-7 px-2.5 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-sm transition-all"
                                >
                                  Complete
                                </button>
                              )}
                              {['Scheduled', 'Rescheduled'].includes(meet.status) && (
                                <button
                                  onClick={() => handleStatusChange(meet.id, 'Cancelled')}
                                  className="h-7 px-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-[10px] font-bold rounded-lg transition-all"
                                >
                                  Cancel
                                </button>
                              )}
                              {['Scheduled', 'Rescheduled'].includes(meet.status) && (
                                <button
                                  onClick={() => {
                                    window.open(meet.meetingLink, '_blank');
                                    setActiveCallMeeting(meet);
                                  }}
                                  className="h-7 px-2.5 bg-[#6A1B2E] hover:bg-[#521221] text-white text-[10px] font-bold rounded-lg shadow-sm transition-all"
                                >
                                  Join Call
                                </button>
                              )}
                              <button
                                onClick={() => setDeleteId(meet.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all ml-1"
                                title="Delete meeting"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 3: ADVISOR WORKLOADS */}
      {activeTab === 'workload' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {advisorWorkloads.map(adv => (
            <Card key={adv.name} className="p-5 text-left border border-slate-200/80 bg-white shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#6A1B2E]/5 text-[#6A1B2E] flex items-center justify-center font-extrabold text-xs">
                  {adv.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800">{adv.name}</h3>
                  <p className="text-[10px] font-semibold text-slate-400">Academic Counselor</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5 pt-3.5 border-t border-slate-100">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Active</span>
                  <span className="text-base font-black text-slate-900">{adv.active}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Completed</span>
                  <span className="text-base font-black text-slate-900">{adv.completed}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50"
              onClick={() => setDeleteId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 text-center"
            >
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">Delete Advisory Session?</h3>
              <p className="text-xs font-semibold text-slate-500 mb-6">
                This will permanently delete the selected meeting and advisory session records.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 h-9.5 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50"
                >
                  Keep Meeting
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 h-9.5 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 shadow-sm"
                >
                  Delete Permanently
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Reschedule Meeting Modal */}
      <AnimatePresence>
        {rescheduleMtgId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setRescheduleMtgId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 z-10 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <h3 className="text-base font-black text-slate-900">Reschedule Advisory Session</h3>
                <button
                  onClick={() => setRescheduleMtgId(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRescheduleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">New Date</label>
                    <input
                      type="date"
                      required
                      value={newDate}
                      min={getLocalDateString()}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">New Start Time</label>
                    <select
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                    >
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="11:30 AM">11:30 AM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="04:30 PM">04:30 PM</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRescheduleMtgId(null)}
                    className="h-9 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-9 px-5 bg-[#6A1B2E] text-white rounded-xl text-xs font-bold hover:bg-[#521221] shadow-xs"
                  >
                    Confirm Reschedule
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Book Student Meeting Modal (Admin) */}
      <AnimatePresence>
        {showBookModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setShowBookModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 z-10 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <h3 className="text-base font-black text-slate-900">Schedule Advisory Meeting</h3>
                <button
                  onClick={() => setShowBookModal(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAdminBookSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Select Student</label>
                  <select
                    required
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                  >
                    {studentsList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.full_name || s.email.split('@')[0]} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Meeting Agenda / Subject</label>
                  <select
                    value={bookSubject}
                    onChange={(e) => setBookSubject(e.target.value)}
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
                      required
                      value={bookDate}
                      min={getLocalDateString()}
                      onChange={(e) => setBookDate(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Preferred Time</label>
                    <select
                      value={bookTime}
                      onChange={(e) => setBookTime(e.target.value)}
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
                    value={bookAdvisor}
                    onChange={(e) => setBookAdvisor(e.target.value)}
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                  >
                    {counselorsList.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Meeting Mode</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBookMode('Online')}
                      className={`flex-1 h-9 rounded-xl text-xs font-bold border transition-all ${bookMode === 'Online'
                          ? 'bg-[#6A1B2E] text-white border-[#6A1B2E]'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      💻 Online Call
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookMode('In-Person')}
                      className={`flex-1 h-9 rounded-xl text-xs font-bold border transition-all ${bookMode === 'In-Person'
                          ? 'bg-[#6A1B2E] text-white border-[#6A1B2E]'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      📍 In-Person
                    </button>
                  </div>
                </div>

                {bookMode === 'Online' ? (
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Video Meeting Link / URL</label>
                    <input
                      type="url"
                      required
                      value={bookLink}
                      onChange={(e) => setBookLink(e.target.value)}
                      placeholder="https://meet.google.com/xyz-abc"
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Physical Location Details</label>
                    <input
                      type="text"
                      required
                      value={bookLocation}
                      onChange={(e) => setBookLocation(e.target.value)}
                      placeholder="e.g. Warsaw Office - Cabin 402"
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Notes (Optional)</label>
                  <textarea
                    value={bookNotes}
                    onChange={(e) => setBookNotes(e.target.value)}
                    placeholder="e.g. Please bring passport photocopy."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40 h-16 resize-none"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBookModal(false)}
                    className="h-9 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isBooking}
                    className="h-9 px-5 bg-[#6A1B2E] text-white rounded-xl text-xs font-bold hover:bg-[#521221] shadow-xs"
                  >
                    {isBooking ? 'Scheduling...' : 'Schedule Meeting'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Video Call Modal */}
      <AnimatePresence>
        {activeCallMeeting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[520px]"
            >
              <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white">{activeCallMeeting.subject}</h3>
                  <p className="text-[10px] font-semibold text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Video Connection Connected
                  </p>
                </div>
              </div>

              <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 relative bg-slate-950">
                <div className="bg-slate-900 rounded-2xl flex items-center justify-center relative border border-slate-800">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-black text-xl flex items-center justify-center mx-auto mb-2 shadow-lg">
                      AD
                    </div>
                    <span className="text-xs font-extrabold text-white">Admin Host</span>
                    <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">Administrator Host</span>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-2xl flex items-center justify-center relative border border-slate-800 overflow-hidden">
                  {!videoOff ? (
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-2xl bg-[#6A1B2E] text-white font-black text-xl flex items-center justify-center mx-auto mb-2 shadow-lg">
                        {(activeCallMeeting.student_name || 'Student').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs font-extrabold text-white">{activeCallMeeting.student_name || 'Student Participant'}</span>
                    </div>
                  ) : (
                    <div className="text-slate-500 text-xs font-bold">Camera Turned Off</div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-3">
                <button
                  onClick={() => setMicMuted(!micMuted)}
                  className={`p-3 rounded-full ${micMuted ? 'bg-red-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                >
                  {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setVideoOff(!videoOff)}
                  className={`p-3 rounded-full ${videoOff ? 'bg-red-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                >
                  {videoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setActiveCallMeeting(null)}
                  className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold text-xs flex items-center gap-1.5 px-5 shadow-md"
                >
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
