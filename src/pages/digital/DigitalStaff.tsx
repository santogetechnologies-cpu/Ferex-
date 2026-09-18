import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Trash2, X, CheckCircle2,
  Mail, Phone, ShieldCheck, ArrowRightLeft,
  Briefcase, Lock, UserPlus, AlertCircle, FolderKanban
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import { useAuth } from '../../contexts/AuthContext';
import { useDigitalPermissions } from '../../hooks/usePermissions';
import {
  getDigitalStaff,
  createDivisionStaff,
  deleteDivisionStaff,
  type DivisionStaffMember
} from '../../lib/api/staff';
import {
  getDigitalProjects,
  assignDigitalProject,
  type DigitalProjectRecord
} from '../../lib/api/digital';

export const DigitalStaff: React.FC = () => {
  const { profile } = useAuth();
  const { isAdmin, canManageStaff } = useDigitalPermissions();

  const [staffList, setStaffList] = useState<DivisionStaffMember[]>([]);
  const [projects, setProjects] = useState<DigitalProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedStaffForProjects, setSelectedStaffForProjects] = useState<DivisionStaffMember | null>(null);

  // Form: Add Staff
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('digital_staff');
  const [newStaffDept, setNewStaffDept] = useState('Product Engineering & Design');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form: Reassign
  const [reassignFromStaffId, setReassignFromStaffId] = useState('');
  const [reassignToStaffId, setReassignToStaffId] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [staffData, projData] = await Promise.all([
        getDigitalStaff(),
        getDigitalProjects()
      ]);
      setStaffList(staffData || []);
      setProjects(projData || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleStaffChange = () => loadData();
    window.addEventListener('ferex_staff_users_change', handleStaffChange);
    window.addEventListener('ferex_digital_projects_change', handleStaffChange);
    return () => {
      window.removeEventListener('ferex_staff_users_change', handleStaffChange);
      window.removeEventListener('ferex_digital_projects_change', handleStaffChange);
    };
  }, [loadData]);

  if (!isAdmin && !canManageStaff) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
          <Lock className="w-8 h-8 text-amber-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-black text-slate-900">Staff Management Restricted</h2>
          <p className="text-sm font-semibold text-slate-500 max-w-sm">
            Staff provisioning and project reassignment is restricted to Agency Administrators.
          </p>
        </div>
      </div>
    );
  }

  // Handle Add Staff
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim()) {
      showToastMsg('Please enter both full name and email.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createDivisionStaff({
        name: newStaffName.trim(),
        email: newStaffEmail.trim(),
        role: newStaffRole,
        division: 'digital',
        department: newStaffDept.trim(),
        phone: newStaffPhone.trim() || undefined,
      });
      showToastMsg(`Staff member ${newStaffName} created successfully!`);
      setShowAddModal(false);
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffPhone('');
      await loadData();
    } catch {
      showToastMsg('Failed to create staff member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Remove Staff
  const handleDeleteStaff = async (member: DivisionStaffMember) => {
    if (!window.confirm(`Are you sure you want to deactivate and remove ${member.name} from Digital staff?`)) {
      return;
    }
    try {
      await deleteDivisionStaff(member.email);
      showToastMsg(`${member.name} removed from active roster.`);
      await loadData();
    } catch {
      showToastMsg('Failed to remove staff member.');
    }
  };

  // Handle Bulk Reassignment
  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignFromStaffId || !reassignToStaffId) {
      showToastMsg('Please select both source and recipient team members.');
      return;
    }
    if (reassignFromStaffId === reassignToStaffId) {
      showToastMsg('Source and recipient must be different.');
      return;
    }

    const targetStaff = staffList.find(s => s.id === reassignToStaffId || s.email === reassignToStaffId);
    if (!targetStaff) {
      showToastMsg('Recipient staff member not found.');
      return;
    }

    setIsReassigning(true);
    try {
      const projectsToTransfer = projects.filter(
        (p: any) => p.assigned_staff_id === reassignFromStaffId || p.assigned_staff_name === reassignFromStaffId || p.assigned_staff_email === reassignFromStaffId
      );

      let transferredCount = 0;
      for (const proj of projectsToTransfer) {
        await assignDigitalProject(
          proj.id,
          targetStaff.id,
          targetStaff.name,
          targetStaff.email,
          profile?.full_name || 'Admin'
        );
        transferredCount++;
      }

      showToastMsg(`Transferred ${transferredCount} projects to ${targetStaff.name}!`);
      setShowReassignModal(false);
      setReassignFromStaffId('');
      setReassignToStaffId('');
      await loadData();
    } catch {
      showToastMsg('Failed to reassign projects.');
    } finally {
      setIsReassigning(false);
    }
  };

  // Calculations
  const totalStaff = staffList.length;
  const assignedProjectsCount = projects.filter((p: any) => p.assigned_staff_name || p.assigned_staff_id).length;
  const unassignedProjectsCount = projects.length - assignedProjectsCount;

  return (
    <div className="space-y-6 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 text-white p-6 md:p-8 shadow-xl border border-cyan-800/30">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest bg-white/15 px-3 py-1 rounded-full border border-white/20">
                Agency Workforce & Project Leads
              </span>
              <span className="text-[10px] font-extrabold text-cyan-300 bg-cyan-500/20 px-2.5 py-1 rounded-full border border-cyan-400/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> Live Team
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Ferex Digital Staff & Engineers</h1>
            <p className="text-xs md:text-sm text-white/85 max-w-2xl font-semibold">
              Manage project managers, UI/UX designers, developers, and agency specialists. Allocate client engagements and deliverables.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setShowReassignModal(true)}
              className="h-10 px-4 rounded-xl text-xs font-black text-white bg-white/15 hover:bg-white/25 border border-white/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4" /> Bulk Reassign
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="h-10 px-5 rounded-xl text-xs font-black text-slate-900 bg-cyan-400 hover:bg-cyan-300 transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Add Team Member
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Total Agency Staff</span>
            <span className="text-2xl font-black text-slate-900">{totalStaff}</span>
            <span className="block text-[10px] font-semibold text-slate-500 mt-1">Designers, Developers & PMs</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600">
            <Users className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Assigned Projects</span>
            <span className="text-2xl font-black text-emerald-600">{assignedProjectsCount}</span>
            <span className="block text-[10px] font-semibold text-slate-500 mt-1">Active client deliverables</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <FolderKanban className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Unallocated Projects</span>
            <span className={`text-2xl font-black ${unassignedProjectsCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {unassignedProjectsCount}
            </span>
            <span className="block text-[10px] font-semibold text-slate-500 mt-1">Require project lead</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <AlertCircle className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Staff Roster Table */}
      <Card className="border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">Active Agency Staff Roster</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Project Managers, Creative Directors, and Full Stack Engineers
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {staffList.length} Active Staff
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-semibold text-slate-400">Loading agency team...</div>
        ) : staffList.length === 0 ? (
          <div className="py-12 text-center text-xs font-semibold text-slate-400">
            No team members found. Click "Add Team Member" to provision an account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Team Member</th>
                  <th className="py-3.5 px-4">Role & Designation</th>
                  <th className="py-3.5 px-4">Department / Discipline</th>
                  <th className="py-3.5 px-4">Assigned Projects</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {staffList.map((member) => {
                  const assignedToThis = projects.filter(
                    (p: any) => p.assigned_staff_id === member.id || p.assigned_staff_name === member.name || p.assigned_staff_email === member.email
                  );

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-600 to-indigo-700 text-white flex items-center justify-center font-black text-xs shadow-xs">
                            {member.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900">{member.name}</div>
                            <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-2">
                              <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {member.email}</span>
                              {member.phone && (
                                <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {member.phone}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-cyan-50 text-cyan-700 border border-cyan-200">
                          <ShieldCheck className="w-3 h-3" />
                          {member.roleLabel || member.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-600">
                        {member.department || 'Digital Services'}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setSelectedStaffForProjects(member)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          <Briefcase className="w-3.5 h-3.5 text-cyan-600" />
                          <span>{assignedToThis.length} Projects</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteStaff(member)}
                          title="Deactivate team member"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Staff Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 text-left"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Add Team Member</h3>
                    <p className="text-xs text-slate-400 font-semibold">Provision project manager or specialist account</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddStaff} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStaffName}
                    onChange={e => setNewStaffName(e.target.value)}
                    placeholder="e.g. Sahil Khan"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={newStaffEmail}
                    onChange={e => setNewStaffEmail(e.target.value)}
                    placeholder="e.g. sahil@ferex.com"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                      Role
                    </label>
                    <select
                      value={newStaffRole}
                      onChange={e => setNewStaffRole(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-cyan-500 bg-white"
                    >
                      <option value="digital_staff">Digital Staff / PM</option>
                      <option value="digital_admin">Digital Admin (Full Access)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={newStaffPhone}
                      onChange={e => setNewStaffPhone(e.target.value)}
                      placeholder="+91 98..."
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                    Department / Discipline
                  </label>
                  <input
                    type="text"
                    value={newStaffDept}
                    onChange={e => setNewStaffDept(e.target.value)}
                    placeholder="e.g. Web Development & UI/UX"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-9 px-5 rounded-xl text-xs font-black text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Team Member'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Reassign Modal */}
      <AnimatePresence>
        {showReassignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 text-left"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <ArrowRightLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Bulk Reassign Projects</h3>
                    <p className="text-xs text-slate-400 font-semibold">Transfer projects between agency staff</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReassignModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleReassign} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                    Transfer From Staff Member *
                  </label>
                  <select
                    required
                    value={reassignFromStaffId}
                    onChange={e => setReassignFromStaffId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-cyan-500 bg-white"
                  >
                    <option value="">Select source team member...</option>
                    {staffList.map(s => {
                      const count = projects.filter(p => (p as any).assigned_staff_id === s.id || p.assigned_staff_name === s.name || (p as any).assigned_staff_email === s.email).length;
                      return (
                        <option key={s.id} value={s.id}>
                          {s.name} ({count} projects)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                    Transfer To Staff Member *
                  </label>
                  <select
                    required
                    value={reassignToStaffId}
                    onChange={e => setReassignToStaffId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-cyan-500 bg-white"
                  >
                    <option value="">Select recipient team member...</option>
                    {staffList
                      .filter(s => s.id !== reassignFromStaffId)
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.roleLabel})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setShowReassignModal(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <button
                    type="submit"
                    disabled={isReassigning}
                    className="h-9 px-5 rounded-xl text-xs font-black text-white bg-amber-600 hover:bg-amber-700 transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isReassigning ? 'Transferring...' : 'Transfer All Projects'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Projects Modal for Selected Staff */}
      <AnimatePresence>
        {selectedStaffForProjects && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col p-6 border border-slate-100 text-left"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Projects Assigned to {selectedStaffForProjects.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold">{selectedStaffForProjects.email}</p>
                </div>
                <button
                  onClick={() => setSelectedStaffForProjects(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {(() => {
                  const assigned = projects.filter(
                    (p: any) => p.assigned_staff_id === selectedStaffForProjects.id || p.assigned_staff_name === selectedStaffForProjects.name || p.assigned_staff_email === selectedStaffForProjects.email
                  );

                  if (assigned.length === 0) {
                    return (
                      <div className="py-8 text-center text-xs text-slate-400 font-semibold">
                        No projects currently assigned to this team member.
                      </div>
                    );
                  }

                  return assigned.map(p => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <div className="font-black text-xs text-slate-900">{p.title}</div>
                        <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-2 mt-0.5">
                          <span className="font-bold text-cyan-600">{p.client_name}</span>
                          <span>·</span>
                          <span>{p.service_category}</span>
                          <span>·</span>
                          <span>Deadline: {p.deadline || 'Ongoing'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
                          {p.status}
                        </span>
                        <div className="text-[10px] font-bold text-slate-700 mt-1">
                          ₹{Number(p.budget || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setSelectedStaffForProjects(null)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
