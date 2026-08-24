import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Video, Search, Trash2, CalendarCheck, AlertTriangle, X, Plus, Mic, MicOff, VideoOff, PhoneOff, Activity, CheckCircle2, List, BarChart3 } from 'lucide-react';
import { Card } from '../../components/Card';
import { useMeetings } from '../../hooks/useMeetings';
import { computeEndTime } from '../../lib/api/meetings';
import { getStudents, getStaffMembers } from '../../lib/api/students';

export const AdminMeetings: React.FC = () => {
  const { meetings: dbMeetings, changeStatus, deleteCall, loading, addMeeting } = useMeetings();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [toastMessage, setToastMessage] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Local Date Helper to avoid UTC offset bugs
  const getLocalDateString = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split('T')[0];
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
  const [activeTab, setActiveTab] = useState<'control' | 'workload'>('control');

  React.useEffect(() => {
    getStudents().then(students => {
      setStudentsList(students);
      if (students.length > 0) setSelectedStudentId(students[0].id);
    }).catch(() => { });

    getStaffMembers().then(staff => {
      if (staff && staff.length > 0) {
        const names = staff.map(s => s.full_name || s.email.split('@')[0]);
        setCounselorsList(names);
        if (names.length > 0) setBookAdvisor(names[0]);
      }
    }).catch(() => { });
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

  // Process and filter meetings
  const meetings = dbMeetings.map(m => ({
    id: m.id,
    subject: m.subject || 'Advisory Session',
    studentName: (m as any).users?.full_name || 'Generic Student',
    studentEmail: (m as any).users?.email || 'student@ferex.com',
    date: new Date(m.scheduled_date || Date.now()).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    time: `${m.start_time || '10:00 AM'} - ${m.end_time || '10:45 AM'}`,
    advisor: m.advisor_name || 'Academic Advisor',
    status: m.status || 'Scheduled',
    meetingLink: m.meeting_link || 'https://meet.google.com/fer-exed-app',
  }));

  const filteredMeetings = meetings.filter(m => {
    const matchesSearch =
      m.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.advisor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = meetings.filter(m => ['Scheduled', 'Rescheduled'].includes(m.status)).length;
  const completedCount = meetings.filter(m => m.status === 'Completed').length;
  const cancelledCount = meetings.filter(m => m.status === 'Cancelled').length;

  const advisorWorkloads = counselorsList.map(advisorName => {
    const advisorMeetings = meetings.filter(m => m.advisor === advisorName);
    const active = advisorMeetings.filter(m => ['Scheduled', 'Rescheduled'].includes(m.status)).length;
    const completed = advisorMeetings.filter(m => m.status === 'Completed').length;
    return { name: advisorName, active, completed };
  });

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
            Meetings & Advisory Tracker
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            Monitor, confirm, and update advisory sessions, SOP consultations, and visa mock interviews.
          </p>
        </div>

        <button
          onClick={() => {
            setShowBookModal(true);
            setBookDate(getLocalDateString());
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
          onClick={() => setActiveTab('control')}
          className={`pb-3.5 text-xs font-bold transition-all relative px-1 flex items-center gap-1.5 ${activeTab === 'control' ? 'text-[#6A1B2E]' : 'text-slate-400 hover:text-slate-600'
            }`}
        >
          <List className="w-4 h-4" /> Control Room (Detailed Log)
          {activeTab === 'control' && <motion.div layoutId="meetingActiveTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6A1B2E]" />}
        </button>
        <button
          onClick={() => setActiveTab('workload')}
          className={`pb-3.5 text-xs font-bold transition-all relative px-1 flex items-center gap-1.5 ${activeTab === 'workload' ? 'text-[#6A1B2E]' : 'text-slate-400 hover:text-slate-600'
            }`}
        >
          <BarChart3 className="w-4 h-4" /> Advisor Workloads
          {activeTab === 'workload' && <motion.div layoutId="meetingActiveTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6A1B2E]" />}
        </button>
      </div>

      {activeTab === 'control' ? (
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
            <div className="flex items-center gap-1.5 w-full sm:w-auto self-stretch">
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
                                    setNewDate(getLocalDateString());
                                    setNewTime('10:00 AM');
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
      ) : (
        /* Advisor Workloads Tab Grid */
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
