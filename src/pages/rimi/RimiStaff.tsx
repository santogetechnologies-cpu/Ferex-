import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Trash2, X, CheckCircle2,
  Mail, Phone, ShieldCheck, ArrowRightLeft,
  Building2, Lock, UserPlus, AlertCircle
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useRimiPermissions } from '../../hooks/usePermissions';
import {
  getRimiStaff,
  createDivisionStaff,
  deleteDivisionStaff,
  type DivisionStaffMember
} from '../../lib/api/staff';
import {
  getRimiCustomers,
  assignRimiCustomer,
  type RimiCustomer
} from '../../lib/api/rimi';

export const RimiStaff: React.FC = () => {
  const { profile } = useAuth();
  const { isAdmin, canManageStaff } = useRimiPermissions();

  const [staffList, setStaffList] = useState<DivisionStaffMember[]>([]);
  const [customers, setCustomers] = useState<RimiCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedStaffForCustomers, setSelectedStaffForCustomers] = useState<DivisionStaffMember | null>(null);

  // Form: Add Staff
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('rimi_staff');
  const [newStaffDept, setNewStaffDept] = useState('Cold Chain Operations');
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
      const [staffData, custData] = await Promise.all([
        getRimiStaff(),
        getRimiCustomers()
      ]);
      setStaffList(staffData || []);
      setCustomers(custData || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleStaffChange = () => loadData();
    window.addEventListener('ferex_staff_users_change', handleStaffChange);
    window.addEventListener('ferex_rimi_crm_customers_change', handleStaffChange);
    return () => {
      window.removeEventListener('ferex_staff_users_change', handleStaffChange);
      window.removeEventListener('ferex_rimi_crm_customers_change', handleStaffChange);
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
            Staff provisioning and customer reassignment is restricted to Cold Chain Administrators.
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
        division: 'rimi',
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
    if (!window.confirm(`Are you sure you want to deactivate and remove ${member.name} from Rimi staff?`)) {
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
      showToastMsg('Please select both source and target staff.');
      return;
    }
    if (reassignFromStaffId === reassignToStaffId) {
      showToastMsg('Source and target staff must be different.');
      return;
    }

    const targetStaff = staffList.find(s => s.id === reassignToStaffId || s.email === reassignToStaffId);
    if (!targetStaff) {
      showToastMsg('Target staff not found.');
      return;
    }

    setIsReassigning(true);
    try {
      const customersToTransfer = customers.filter(
        c => c.assigned_staff_id === reassignFromStaffId || c.assigned_staff_name === reassignFromStaffId
      );

      let transferredCount = 0;
      for (const cust of customersToTransfer) {
        await assignRimiCustomer(
          cust.id,
          targetStaff.id,
          targetStaff.name,
          profile?.full_name || 'Admin'
        );
        transferredCount++;
      }

      showToastMsg(`Successfully transferred ${transferredCount} customers to ${targetStaff.name}!`);
      setShowReassignModal(false);
      setReassignFromStaffId('');
      setReassignToStaffId('');
      await loadData();
    } catch {
      showToastMsg('Failed to reassign customers.');
    } finally {
      setIsReassigning(false);
    }
  };

  // Calculations
  const totalStaff = staffList.length;
  const assignedCustomersCount = customers.filter(c => c.assigned_staff_id || c.assigned_staff_name).length;
  const unassignedCustomersCount = customers.length - assignedCustomersCount;

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#58051E] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-white/20 animate-fade-in text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#58051E] via-[#430316] to-[#3B0B16] text-white p-6 md:p-8 shadow-xl border border-[#58051E]/30">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest bg-white/15 px-3 py-1 rounded-full border border-white/20">
                Operations & Workforce
              </span>
              <span className="text-[10px] font-extrabold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Roster
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Rimi Staff & Field Operations</h1>
            <p className="text-xs md:text-sm text-white/85 max-w-2xl font-semibold">
              Manage field sales executives, cold chain warehouse operations staff, and assign customer distribution accounts.
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
              className="h-10 px-5 rounded-xl text-xs font-black text-[#58051E] bg-white hover:bg-slate-100 transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Add Staff Member
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Total Staff Members</span>
            <span className="text-2xl font-black text-slate-900">{totalStaff}</span>
            <span className="block text-[10px] font-semibold text-slate-500 mt-1">Rimi Operations & Logistics</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#58051E]/10 border border-[#58051E]/20 flex items-center justify-center text-[#58051E]">
            <Users className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Assigned Customers</span>
            <span className="text-2xl font-black text-emerald-600">{assignedCustomersCount}</span>
            <span className="block text-[10px] font-semibold text-slate-500 mt-1">Active client relationships</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Building2 className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Unassigned Accounts</span>
            <span className={`text-2xl font-black ${unassignedCustomersCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {unassignedCustomersCount}
            </span>
            <span className="block text-[10px] font-semibold text-slate-500 mt-1">Require staff allocation</span>
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
            <h3 className="text-sm font-black text-slate-900">Active Rimi Operations Team</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Field managers, dispatch supervisors, and distribution account specialists
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {staffList.length} Active Staff
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-semibold text-slate-400">Loading staff roster...</div>
        ) : staffList.length === 0 ? (
          <div className="py-12 text-center text-xs font-semibold text-slate-400">
            No staff members found. Click "Add Staff Member" to provision an account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4">Role & Designation</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Assigned Accounts</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {staffList.map((member) => {
                  const assignedToThis = customers.filter(
                    c => c.assigned_staff_id === member.id || c.assigned_staff_name === member.name
                  );

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#58051E] to-[#7b0d2d] text-white flex items-center justify-center font-black text-xs shadow-xs">
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
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#58051E]/10 text-[#58051E] border border-[#58051E]/20">
                          <ShieldCheck className="w-3 h-3" />
                          {member.roleLabel || member.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-600">
                        {member.department || 'Operations'}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setSelectedStaffForCustomers(member)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          <Building2 className="w-3.5 h-3.5 text-[#58051E]" />
                          <span>{assignedToThis.length} Accounts</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteStaff(member)}
                          title="Deactivate staff member"
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
                  <div className="w-9 h-9 rounded-xl bg-[#58051E]/10 text-[#58051E] flex items-center justify-center">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Add Staff Member</h3>
                    <p className="text-xs text-slate-400 font-semibold">Create an operations or field sales account</p>
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
                    placeholder="e.g. Ramesh Kulkarni"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#58051E]"
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
                    placeholder="e.g. ramesh@ferex.com"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#58051E]"
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
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#58051E] bg-white"
                    >
                      <option value="rimi_staff">Rimi Staff (Operations)</option>
                      <option value="rimi_admin">Rimi Admin (Full Access)</option>
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
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={newStaffDept}
                    onChange={e => setNewStaffDept(e.target.value)}
                    placeholder="e.g. Cold Chain Logistics"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#58051E]"
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
                    className="h-9 px-5 rounded-xl text-xs font-black text-white bg-[#58051E] hover:bg-[#430316] transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Staff Member'}
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
                    <h3 className="text-base font-black text-slate-900">Bulk Reassign Accounts</h3>
                    <p className="text-xs text-slate-400 font-semibold">Transfer customer accounts between staff members</p>
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
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#58051E] bg-white"
                  >
                    <option value="">Select source staff member...</option>
                    {staffList.map(s => {
                      const count = customers.filter(c => c.assigned_staff_id === s.id || c.assigned_staff_name === s.name).length;
                      return (
                        <option key={s.id} value={s.id}>
                          {s.name} ({count} accounts)
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
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#58051E] bg-white"
                  >
                    <option value="">Select recipient staff member...</option>
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
                    {isReassigning ? 'Transferring...' : 'Transfer All Accounts'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Customer Accounts Drawer / Modal for Selected Staff */}
      <AnimatePresence>
        {selectedStaffForCustomers && (
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
                    Accounts Assigned to {selectedStaffForCustomers.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold">{selectedStaffForCustomers.email}</p>
                </div>
                <button
                  onClick={() => setSelectedStaffForCustomers(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {(() => {
                  const assigned = customers.filter(
                    c => c.assigned_staff_id === selectedStaffForCustomers.id || c.assigned_staff_name === selectedStaffForCustomers.name
                  );

                  if (assigned.length === 0) {
                    return (
                      <div className="py-8 text-center text-xs text-slate-400 font-semibold">
                        No customer accounts currently assigned to this staff member.
                      </div>
                    );
                  }

                  return assigned.map(c => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <div className="font-black text-xs text-slate-900">{c.business_name}</div>
                        <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-2 mt-0.5">
                          <span className="font-bold text-[#58051E]">{c.customer_type}</span>
                          <span>·</span>
                          <span>{c.region}</span>
                          <span>·</span>
                          <span>{c.contact_person}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          {c.pipeline_stage}
                        </span>
                        {c.outstanding_balance !== undefined && c.outstanding_balance > 0 && (
                          <div className="text-[10px] font-bold text-rose-600 mt-1">
                            ₹{c.outstanding_balance.toLocaleString('en-IN')} due
                          </div>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setSelectedStaffForCustomers(null)}
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
