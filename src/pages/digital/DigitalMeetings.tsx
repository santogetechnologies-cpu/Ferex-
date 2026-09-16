import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, X, CheckCircle2, Trash2, Video, Search, User, Clock, Building2, Globe2, Layers, ExternalLink } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getDigitalMeetings,
  createDigitalMeeting,
  deleteDigitalMeeting,
  getDigitalClients,
  getDigitalStaffMembers,
  type DigitalMeetingRecord
} from '../../lib/api/digital';
import { useAuth } from '../../contexts/AuthContext';

export const DigitalMeetings: React.FC = () => {
  const { profile } = useAuth();
  const [meetings, setMeetings] = useState<DigitalMeetingRecord[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hostFilter, setHostFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');

  const [newMtg, setNewMtg] = useState({
    title: '',
    client: '',
    client_id: '',
    host_staff_name: profile?.full_name || 'Digital Project Manager',
    host_staff_email: profile?.email || 'pm@ferex.com',
    time: '03:00 PM',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    platform: 'Google Meet',
    meeting_type: 'Sprint Review',
    link: 'https://meet.google.com/fer-dig-arch',
    notes: ''
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mtgData, clientData, staffData] = await Promise.all([
        getDigitalMeetings(),
        getDigitalClients(),
        getDigitalStaffMembers()
      ]);
      setMeetings(mtgData || []);
      setClients(clientData || []);
      setStaffList(staffData || []);

      if (clientData && clientData.length > 0 && !newMtg.client) {
        setNewMtg(prev => ({
          ...prev,
          client: clientData[0].company_name || clientData[0].name || 'Ferex Division',
          client_id: clientData[0].id
        }));
      }

      if (staffData && staffData.length > 0 && !newMtg.host_staff_name) {
        setNewMtg(prev => ({
          ...prev,
          host_staff_name: staffData[0].name,
          host_staff_email: staffData[0].email
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [newMtg.client, newMtg.host_staff_name]);

  useEffect(() => {
    loadData();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_digital_meetings_change', handleLocalChange);
    window.addEventListener('ferex_digital_clients_change', handleLocalChange);
    window.addEventListener('ferex_staff_users_change', handleLocalChange);

    return () => {
      window.removeEventListener('ferex_digital_meetings_change', handleLocalChange);
      window.removeEventListener('ferex_digital_clients_change', handleLocalChange);
      window.removeEventListener('ferex_staff_users_change', handleLocalChange);
    };
  }, [loadData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMtg.title.trim()) return;

    const matchedClient = clients.find(c => c.id === newMtg.client_id || c.company_name === newMtg.client);
    const matchedStaff = staffList.find(s => s.name === newMtg.host_staff_name);
    const clientName = matchedClient?.company_name || newMtg.client || (clients.length > 0 ? clients[0].company_name : 'Enterprise Client');
    const hostName = newMtg.host_staff_name || (staffList.length > 0 ? staffList[0].name : (profile?.full_name || 'Digital Project Manager'));
    const hostEmail = matchedStaff?.email || newMtg.host_staff_email || profile?.email || 'pm@ferex.com';
    const formattedTime = `${newMtg.date || 'Tomorrow'}, ${newMtg.time || '03:00 PM'}`;

    await createDigitalMeeting({
      title: newMtg.title,
      client: clientName,
      client_id: matchedClient?.id,
      host_staff_name: hostName,
      host_staff_email: hostEmail,
      time: formattedTime,
      date: newMtg.date,
      platform: newMtg.platform,
      meeting_type: newMtg.meeting_type,
      link: newMtg.link,
      notes: newMtg.notes
    });

    setShowAddModal(false);
    showToast(`Scheduled call: "${newMtg.title}"`);
    setNewMtg({
      title: '',
      client: clients.length > 0 ? (clients[0].company_name || clients[0].name) : '',
      client_id: clients.length > 0 ? clients[0].id : '',
      host_staff_name: profile?.full_name || (staffList.length > 0 ? staffList[0].name : 'Digital Project Manager'),
      host_staff_email: profile?.email || (staffList.length > 0 ? staffList[0].email : 'pm@ferex.com'),
      time: '03:00 PM',
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      platform: 'Google Meet',
      meeting_type: 'Sprint Review',
      link: 'https://meet.google.com/fer-dig-arch',
      notes: ''
    });
    await loadData();
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDigitalMeeting(id);
      setMeetings(prev => prev.filter(m => m.id !== id));
      showToast('Meeting cancelled');
    } catch (err: any) {
      showToast(`Error deleting meeting: ${err.message || 'Unknown error'}`);
    }
  };

  const filtered = meetings.filter(m => {
    const matchSearch =
      (m.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.client || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.host_staff_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.notes || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.meeting_type || '').toLowerCase().includes(search.toLowerCase());

    const myName = (profile?.full_name || '').toLowerCase();
    const myEmail = (profile?.email || '').toLowerCase();
    const hostName = (m.host_staff_name || '').toLowerCase();
    const hostEmail = (m.host_staff_email || '').toLowerCase();

    let matchHost = true;
    if (hostFilter === 'ME') {
      matchHost = Boolean((myName && hostName.includes(myName)) || (myEmail && hostEmail === myEmail));
    } else if (hostFilter !== 'All') {
      matchHost = hostName === hostFilter.toLowerCase();
    }

    return matchSearch && matchHost;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#58051E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#58051E]" /> Client Meetings & Discovery Calls
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Digital ERP • Schedule client architecture reviews, sprint demos, and discovery sessions with live staff hosts.
          </p>
        </div>
        <Button size="sm" className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold shadow-sm" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Schedule Client Call
        </Button>
      </div>

      {/* Control & Search Bar */}
      <Card className="p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search meeting, client, host staff..."
            className="w-full h-9 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={hostFilter}
            onChange={(e) => setHostFilter(e.target.value)}
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-[#58051E]"
          >
            <option value="All">All Meeting Hosts</option>
            <option value="ME">⚡ Hosted by Me</option>
            {staffList.map((s: any) => (
              <option key={s.id || s.email} value={s.name}>{s.name}</option>
            ))}
          </select>
          <span className="text-xs font-bold text-slate-400 shrink-0">{filtered.length} Scheduled</span>
        </div>
      </Card>

      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400">Loading meeting schedule...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500">No scheduled meetings found.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((m) => {
            const hostName = m.host_staff_name || 'Digital Project Manager';
            const initials = hostName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

            return (
              <Card key={m.id} className="p-5 border border-slate-200/80 shadow-xs space-y-4 hover:border-[#58051E]/40 hover:shadow-md transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase text-[#58051E] bg-[#58051E]/10 px-2 py-0.5 rounded-md">
                      {m.meeting_type || 'Sprint Call'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                      {m.platform || 'Google Meet'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-snug">{m.title}</h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5 truncate">{m.client}</p>
                    {m.notes && (
                      <p className="text-[11px] text-slate-600 mt-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2">
                        {m.notes}
                      </p>
                    )}
                  </div>

                  {/* Meeting Meta Pill */}
                  <div className="p-3 bg-slate-50/80 rounded-xl space-y-2 text-xs text-slate-600 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                        <User className="w-3.5 h-3.5" /> Call Host:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-[#58051E] text-white text-[9px] font-black flex items-center justify-center">
                          {initials}
                        </div>
                        <span className="text-xs font-bold text-slate-800">{hostName}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                      <span className="text-slate-400 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Timing:
                      </span>
                      <span className="font-bold text-slate-800">{m.time}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <a
                    href={m.link || 'https://meet.google.com'}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 text-center py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <Video className="w-3.5 h-3.5 text-emerald-400" /> Join Call
                  </a>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Cancel Meeting"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── SCHEDULE MEETING MODAL ── */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 text-left max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900">Schedule Client Call</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Meeting Purpose / Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newMtg.title}
                    onChange={(e) => setNewMtg({ ...newMtg, title: e.target.value })}
                    placeholder="e.g. Sprint Architecture & UI Demo Review"
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      Client / Division *
                    </label>
                    {clients.length > 0 ? (
                      <select
                        value={newMtg.client_id}
                        onChange={(e) => {
                          const sel = clients.find(c => c.id === e.target.value);
                          setNewMtg({
                            ...newMtg,
                            client_id: e.target.value,
                            client: sel?.company_name || sel?.name || ''
                          });
                        }}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                      >
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>
                            [{c.client_type || 'Internal'}] {c.company_name || c.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={newMtg.client}
                        onChange={(e) => setNewMtg({ ...newMtg, client: e.target.value })}
                        placeholder="Enterprise Client"
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      Meeting Type
                    </label>
                    <select
                      value={newMtg.meeting_type}
                      onChange={(e) => setNewMtg({ ...newMtg, meeting_type: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="Sprint Review">Sprint Review & Architecture</option>
                      <option value="Client Discovery">Client Discovery & Kickoff</option>
                      <option value="UI/UX Demo">UI/UX Demo & Prototyping</option>
                      <option value="Retainer Check-in">Monthly Retainer Check-in</option>
                      <option value="Contract Negotiation">Contract & Milestone Review</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      Assigned Host Staff *
                    </label>
                    <select
                      value={newMtg.host_staff_name}
                      onChange={(e) => {
                        const name = e.target.value;
                        const matched = staffList.find(s => s.name === name);
                        setNewMtg({
                          ...newMtg,
                          host_staff_name: name,
                          host_staff_email: matched?.email || `${name.toLowerCase().replace(/[^a-z]/g, '')}@ferex.com`
                        });
                      }}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    >
                      {staffList.map((s: any) => (
                        <option key={s.id || s.email} value={s.name}>
                          {s.name} ({s.roleLabel || s.role || 'Host'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      Platform
                    </label>
                    <select
                      value={newMtg.platform}
                      onChange={(e) => setNewMtg({ ...newMtg, platform: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="Google Meet">Google Meet</option>
                      <option value="Zoom">Zoom Video</option>
                      <option value="Microsoft Teams">Microsoft Teams</option>
                      <option value="In-Person HQ">In-Person Ferex HQ Boardroom</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={newMtg.date}
                      onChange={(e) => setNewMtg({ ...newMtg, date: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      Time
                    </label>
                    <input
                      type="text"
                      value={newMtg.time}
                      onChange={(e) => setNewMtg({ ...newMtg, time: e.target.value })}
                      placeholder="03:00 PM"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Meeting URL / Conference Link
                  </label>
                  <input
                    type="url"
                    value={newMtg.link}
                    onChange={(e) => setNewMtg({ ...newMtg, link: e.target.value })}
                    placeholder="https://meet.google.com/..."
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Agenda & Discussion Points
                  </label>
                  <textarea
                    rows={3}
                    value={newMtg.notes}
                    onChange={(e) => setNewMtg({ ...newMtg, notes: e.target.value })}
                    placeholder="Key agenda items, demo walkthrough steps, questions to resolve..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">
                    Schedule Call
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
