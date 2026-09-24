import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Headphones, Plus, Search, Filter, AlertCircle, CheckCircle2,
  X, MessageSquare, Clock, ArrowRight, User
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { ToastNotification } from '../../../components/ToastNotification';
import { supabase } from '../../../lib/supabase';
import {
  getAssignedDigitalTickets,
  createDigitalTicketDirect,
  updateDigitalTicketDirect,
  getAssignedDigitalProjects,
  type DigitalTicket
} from '../../../lib/api/digitalPm';

export const DigitalPMTickets: React.FC = () => {
  const { user, profile } = useAuth();

  const [tickets, setTickets] = useState<DigitalTicket[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const [selectedTicket, setSelectedTicket] = useState<DigitalTicket | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: '',
    project_id: '',
    description: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Urgent'
  });

  const pmIdentity = {
    id: user?.id,
    email: profile?.email || user?.email,
    full_name: profile?.full_name,
    name: profile?.full_name
  };

  const loadTicketsData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [tList, pList] = await Promise.all([
        getAssignedDigitalTickets(undefined, pmIdentity),
        getAssignedDigitalProjects(pmIdentity)
      ]);
      setTickets(tList || []);
      setProjects(pList || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load client tickets from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicketsData();

    const channel = supabase
      .channel('realtime_pm_tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_tickets' }, () => loadTicketsData())
      .subscribe();

    const handleLocalChange = () => loadTicketsData();
    window.addEventListener('ferex_digital_tickets_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_tickets_change', handleLocalChange);
    };
  }, [user?.id, profile?.email]);

  const handleUpdateStatus = async (ticket: DigitalTicket, newStatus: DigitalTicket['status']) => {
    try {
      await updateDigitalTicketDirect(ticket.id, {
        status: newStatus,
        resolution_notes: resolutionNotes || ticket.resolution_notes
      });
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: newStatus, resolution_notes: resolutionNotes || t.resolution_notes } : t));
      if (selectedTicket?.id === ticket.id) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus, resolution_notes: resolutionNotes || prev.resolution_notes } : null);
      }
      showToast(`Ticket status updated to ${newStatus}`);
    } catch (err: any) {
      showToast(`Database Error: ${err.message}`);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.title.trim()) return;

    try {
      const selectedProj = projects.find(p => p.id === newTicket.project_id);
      const created = await createDigitalTicketDirect({
        title: newTicket.title,
        project_id: selectedProj?.id,
        project_title: selectedProj?.title || 'Client Support',
        client_name: selectedProj?.client_name || 'Client',
        description: newTicket.description,
        priority: newTicket.priority,
        status: 'Open',
        assigned_to_name: profile?.full_name || 'Project Manager',
        assigned_to_email: profile?.email || user?.email || '',
        assigned_staff_id: user?.id
      });

      setTickets(prev => [created, ...prev]);
      setShowAddModal(false);
      showToast(`Created ticket "${newTicket.title}" successfully`);
      setNewTicket({ title: '', project_id: '', description: '', priority: 'Medium' });
    } catch (err: any) {
      showToast(`Database Error: ${err.message}`);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch =
      (t.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.project_title || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.ticket_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.client_name || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 relative text-left pb-8">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#58051E]/8 text-[#58051E] flex items-center justify-center">
              <Headphones className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Client Tickets & Revisions Desk
            </h1>
            <Badge variant="brand">{filteredTickets.length} Tickets</Badge>
          </div>
          <p className="text-xs text-slate-500">
            Handle design revisions, client feedback, bug reports, and delivery change requests directly from Supabase.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          New Ticket
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
            placeholder="Search tickets, project, ID..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['All', 'Open', 'In Progress', 'Resolved', 'Closed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#58051E] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-subtle overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center items-center">
            <div className="w-8 h-8 border-3 border-[#58051E] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs font-medium">
            No client tickets found matching your filter criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  setSelectedTicket(t);
                  setResolutionNotes(t.resolution_notes || '');
                }}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      {t.ticket_number}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 truncate">
                      {t.title}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-1 mb-1.5">
                    {t.description || 'No description provided.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-700">{t.project_title || 'General'}</span>
                    <span>Client: {t.client_name || 'Client Account'}</span>
                    <span>Created: {new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    t.priority === 'Urgent' || t.priority === 'High'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {t.priority}
                  </span>

                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                    t.status === 'Resolved' || t.status === 'Closed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : t.status === 'In Progress'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ticket Details Drawer */}
      <AnimatePresence>
        {selectedTicket && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50"
              onClick={() => setSelectedTicket(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto p-6 text-left flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                      {selectedTicket.ticket_number} • {selectedTicket.client_name || 'Client'}
                    </span>
                    <h2 className="text-base font-bold text-slate-900 mt-0.5">
                      {selectedTicket.title}
                    </h2>
                  </div>
                  <button onClick={() => setSelectedTicket(null)} className="p-1 text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Issue / Revision Details</span>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 whitespace-pre-wrap">
                      {selectedTicket.description || 'No detailed issue body provided.'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-semibold">Associated Project</span>
                      <span className="text-xs font-bold text-slate-800 block mt-0.5 truncate">
                        {selectedTicket.project_title || 'General'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-semibold">Priority</span>
                      <span className="text-xs font-bold text-slate-800 block mt-0.5">
                        {selectedTicket.priority}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">PM Resolution Notes / Comments</span>
                    <textarea
                      rows={3}
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Add resolution explanation, commit hash, Figma revision link..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-2">Update Ticket Status</span>
                    <div className="grid grid-cols-4 gap-2">
                      {(['Open', 'In Progress', 'Resolved', 'Closed'] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => handleUpdateStatus(selectedTicket, st)}
                          className={`py-2 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                            selectedTicket.status === st
                              ? 'bg-[#58051E] text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setSelectedTicket(null)} className="w-full">
                  Close Ticket View
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* New Ticket Modal */}
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
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 p-6 text-left"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Create Client Ticket / Revision</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Ticket Title *</label>
                  <input
                    type="text"
                    required
                    value={newTicket.title}
                    onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                    placeholder="e.g. Header typography revision & mobile alignment fix"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Project</label>
                    <select
                      value={newTicket.project_id}
                      onChange={(e) => setNewTicket({ ...newTicket, project_id: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                    >
                      <option value="">Select Project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Priority</label>
                    <select
                      value={newTicket.priority}
                      onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Issue Description / Change Scope</label>
                  <textarea
                    rows={3}
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                    placeholder="Client feedback details, expected adjustments..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button size="sm" type="submit">Create Ticket</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
