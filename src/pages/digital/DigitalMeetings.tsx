import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Plus, X, Video, Search, User, Clock,
  ExternalLink, CheckCircle2, AlertCircle, Trash2, Globe2
} from 'lucide-react';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  getDigitalMeetings,
  createDigitalMeeting,
  updateDigitalMeetingStatus,
  deleteDigitalMeeting,
  type DigitalMeetingRecord
} from '../../lib/api/digitalMeetings';
import { getDigitalClients, type DigitalClientRecord } from '../../lib/api/digital';

const MEETING_TYPES = [
  'Discovery Call',
  'Sprint Review',
  'Architecture Review',
  'Deliverable Sign-off',
  'Client Demo',
  'General Meeting'
];

export const DigitalMeetings: React.FC = () => {
  const { profile, user } = useAuth();

  const [meetings, setMeetings] = useState<DigitalMeetingRecord[]>([]);
  const [clients, setClients] = useState<DigitalClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newMtg, setNewMtg] = useState({
    title: '',
    client_id: '',
    client_name: '',
    host_staff_name: profile?.full_name || 'Digital Director',
    host_staff_email: profile?.email || user?.email || 'digital@ferex.com',
    time_display: '03:00 PM',
    date_display: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    platform: 'Google Meet' as 'Google Meet' | 'Zoom' | 'Microsoft Teams' | 'In-Person',
    meeting_type: 'Discovery Call',
    meeting_url: 'https://meet.google.com/fer-dig-rev',
    agenda: '',
    notes: ''
  });

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [mtgList, clientList] = await Promise.all([
        getDigitalMeetings(),
        getDigitalClients()
      ]);
      setMeetings(mtgList || []);
      setClients(clientList || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load client meetings from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_digital_meetings_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_meetings' }, () => loadData())
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_digital_meetings_change', handleLocalChange);
    window.addEventListener('ferex_digital_clients_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_meetings_change', handleLocalChange);
      window.removeEventListener('ferex_digital_clients_change', handleLocalChange);
    };
  }, []);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMtg.title.trim()) return;

    try {
      const selectedClient = clients.find(c => c.id === newMtg.client_id);
      const clientName = selectedClient?.company_name || newMtg.client_name || 'Enterprise Client';

      const created = await createDigitalMeeting({
        title: newMtg.title,
        client_id: selectedClient?.id || '',
        client_name: clientName,
        host_staff_name: newMtg.host_staff_name || profile?.full_name || 'Digital Director',
        host_staff_email: newMtg.host_staff_email || profile?.email || 'digital@ferex.com',
        time_display: newMtg.time_display,
        date_display: newMtg.date_display,
        scheduled_at: `${newMtg.date_display}T12:00:00.000Z`,
        platform: newMtg.platform,
        meeting_type: newMtg.meeting_type,
        meeting_url: newMtg.meeting_url,
        agenda: newMtg.agenda,
        notes: newMtg.notes,
        status: 'Scheduled'
      });

      setMeetings(prev => [created, ...prev]);
      setShowAddModal(false);
      setNewMtg({
        title: '',
        client_id: '',
        client_name: '',
        host_staff_name: profile?.full_name || 'Digital Director',
        host_staff_email: profile?.email || user?.email || 'digital@ferex.com',
        time_display: '03:00 PM',
        date_display: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        platform: 'Google Meet',
        meeting_type: 'Discovery Call',
        meeting_url: 'https://meet.google.com/fer-dig-rev',
        agenda: '',
        notes: ''
      });
    } catch (err: any) {
      alert(`Database Error: ${err.message}`);
    }
  };

  const handleStatusChange = async (id: string, status: DigitalMeetingRecord['status']) => {
    try {
      await updateDigitalMeetingStatus(id, status);
      setMeetings(prev => prev.map(m => m.id === id ? { ...m, status } : m));
    } catch (err: any) {
      alert(`Database Error: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to cancel and remove this scheduled meeting?')) return;
    try {
      await deleteDigitalMeeting(id);
      setMeetings(prev => prev.filter(m => m.id !== id));
    } catch (err: any) {
      alert(`Database Error: ${err.message}`);
    }
  };

  const filteredMeetings = meetings.filter(m => {
    const matchesSearch =
      (m.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.host_staff_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.agenda || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || m.status === statusFilter;
    const matchesType = typeFilter === 'All' || m.meeting_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6 relative text-left pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#58051E]/8 text-[#58051E] flex items-center justify-center">
              <Video className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Client Meetings & Discovery Calls
            </h1>
            <Badge variant="brand">{filteredMeetings.length} Scheduled</Badge>
          </div>
          <p className="text-xs text-slate-500">
            Schedule client architecture reviews, sprint demos, and discovery sessions with live staff hosts.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Schedule Meeting
        </Button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search meetings, clients, hosts..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
          >
            <option value="All">All Meeting Types</option>
            {MEETING_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
          >
            <option value="All">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Rescheduled">Rescheduled</option>
          </select>
        </div>
      </div>

      {/* Meetings Grid / List */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="w-8 h-8 border-3 border-[#58051E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-xl p-16 text-center text-slate-400 text-xs font-medium">
          No client meetings scheduled matching your filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMeetings.map((m) => (
            <div
              key={m.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate max-w-[160px]">
                    {m.client_name || 'Client Account'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    m.status === 'Completed'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : m.status === 'Cancelled'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {m.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  {m.title}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#58051E]/8 text-[#58051E] inline-block mb-3">
                  {m.meeting_type}
                </span>

                {m.agenda && (
                  <p className="text-xs text-slate-500 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3">
                    {m.agenda}
                  </p>
                )}

                <div className="space-y-1 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{m.date_display || 'Scheduled Date'} • {m.time_display || '11:00 AM'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Host: {m.host_staff_name || 'Digital Staff'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {m.meeting_url ? (
                  <a
                    href={m.meeting_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#58051E] hover:bg-[#430417] text-white text-xs font-bold transition-all shadow-2xs"
                  >
                    <Video className="w-3.5 h-3.5" /> Join Call
                  </a>
                ) : (
                  <span className="text-xs text-slate-400">In-Person Session</span>
                )}

                <div className="flex items-center gap-1">
                  <select
                    value={m.status}
                    onChange={(e) => handleStatusChange(m.id, e.target.value as any)}
                    className="text-[10px] font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 cursor-pointer"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Rescheduled">Rescheduled</option>
                  </select>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                    title="Cancel Meeting"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Meeting Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 p-6 text-left"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Schedule Client Meeting / Discovery Call</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateMeeting} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Meeting Title *</label>
                  <input
                    type="text"
                    required
                    value={newMtg.title}
                    onChange={(e) => setNewMtg({ ...newMtg, title: e.target.value })}
                    placeholder="e.g. Q4 Omni-channel Architecture Review & Demo"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Client / Division</label>
                    <select
                      value={newMtg.client_id}
                      onChange={(e) => {
                        const sel = clients.find(c => c.id === e.target.value);
                        setNewMtg({
                          ...newMtg,
                          client_id: e.target.value,
                          client_name: sel?.company_name || ''
                        });
                      }}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white"
                    >
                      <option value="">-- Select Client --</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          [{c.client_type || 'Client'}] {c.company_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Meeting Type</label>
                    <select
                      value={newMtg.meeting_type}
                      onChange={(e) => setNewMtg({ ...newMtg, meeting_type: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white"
                    >
                      {MEETING_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={newMtg.date_display}
                      onChange={(e) => setNewMtg({ ...newMtg, date_display: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Time</label>
                    <input
                      type="text"
                      value={newMtg.time_display}
                      onChange={(e) => setNewMtg({ ...newMtg, time_display: e.target.value })}
                      placeholder="e.g. 03:30 PM"
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Video Meeting URL</label>
                  <input
                    type="url"
                    value={newMtg.meeting_url}
                    onChange={(e) => setNewMtg({ ...newMtg, meeting_url: e.target.value })}
                    placeholder="https://meet.google.com/..."
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Session Agenda & Scope</label>
                  <textarea
                    rows={3}
                    value={newMtg.agenda}
                    onChange={(e) => setNewMtg({ ...newMtg, agenda: e.target.value })}
                    placeholder="Key deliverables to review, discovery questionnaire, client attendees..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button size="sm" type="submit">Schedule Call</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
