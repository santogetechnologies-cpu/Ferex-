import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, Plus, Shield, CheckCircle2, X } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const CentralRoles: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');

  const [roles, setRoles] = useState([
    {
      id: 1,
      name: 'Super Admin',
      members: 1,
      accessLevel: 'Full Global Access',
      desc: 'Owner access to all platform controls, financial wire payouts, and staff management.',
      badge: 'bg-[#6A1B2E] text-white'
    },
    {
      id: 2,
      name: 'Senior Admissions Counselor',
      members: 12,
      accessLevel: 'Students & Applications Read/Write',
      desc: 'Can manage student journey stages, upload documents, and schedule meetings.',
      badge: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
      id: 3,
      name: 'Visa & Document Officer',
      members: 6,
      accessLevel: 'Document Vault & Support Desk',
      desc: 'Can inspect transcripts, passport records, and respond to support tickets.',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    },
    {
      id: 4,
      name: 'Regional Representative',
      members: 5,
      accessLevel: 'Regional University Alliances Read-Only',
      desc: 'Local university partner liaisons for Warsaw, Berlin, and Amsterdam campuses.',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }
  ]);

  const [newRole, setNewRole] = useState({ name: '', desc: '', accessLevel: 'Standard Read/Write' });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole.name) return;
    const created = {
      id: Date.now(),
      ...newRole,
      members: 0,
      badge: 'bg-slate-100 text-slate-700 border-slate-200'
    };
    setRoles([...roles, created]);
    setShowAddModal(false);
    showToastMsg(`Role template "${newRole.name}" created!`);
    setNewRole({ name: '', desc: '', accessLevel: 'Standard Read/Write' });
  };

  return (
    <div className="space-y-6 text-left">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#6A1B2E]" /> Users & Role Permissions Matrix
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Super Admin Console • RBAC policy management, staff privileges, and security tiers.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Create New Role
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roles.map((role) => (
          <Card key={role.id} className="p-6 border border-slate-200/70 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#6A1B2E]" />
                  <h3 className="text-sm font-black text-slate-900">{role.name}</h3>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${role.badge}`}>
                  {role.members} Staff Members
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 mb-4">{role.desc}</p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-700">
                <span className="text-[10px] uppercase font-black text-slate-400 block mb-0.5">Permission Scope</span>
                {role.accessLevel}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button onClick={() => showToastMsg(`Configured permissions for ${role.name}`)} className="text-xs font-bold text-[#6A1B2E] hover:underline">
                Edit Permissions Matrix
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Role Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Create Custom Role Template</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCreateRole} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Role Title</label>
                  <input type="text" required value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} placeholder="e.g. Audit Manager" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Description</label>
                  <textarea rows={2} value={newRole.desc} onChange={(e) => setNewRole({ ...newRole, desc: e.target.value })} placeholder="Brief role summary..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save Role</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
