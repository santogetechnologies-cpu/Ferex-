import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, Plus, Shield, CheckCircle2, X, Crown, GraduationCap, Globe, Snowflake, Monitor } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';

export const CentralRoles: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');

  const [roles, setRoles] = useState([
    {
      id: 1,
      name: 'Central Super Admin',
      division: 'All 4 Enterprise Apps',
      icon: Crown,
      members: 1,
      accessLevel: 'Full Enterprise Command',
      desc: 'Master governance across Ferex Education, Global Trade ERP, Rimi Frozen Distribution, and Ferex Digital. Controls user provisioning, financial ledgers, and division delegation.',
      badge: 'bg-[#6A1B2E] text-white',
      modules: ['User & Admin Management', '4-App Executive Switcher', 'Financial Payouts', 'Audit Logs', 'Global SLA Governance']
    },
    {
      id: 2,
      name: 'Ferex Education Admin',
      division: 'Ferex Education Division',
      icon: GraduationCap,
      members: 3,
      accessLevel: 'Education Full Control',
      desc: 'Controls international students, university alliances, application workflows, document legalization (NAWA), tuition fees, and VFS visa tracking.',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      modules: ['Students Directory', 'University Applications', 'Document Vault', 'Tuition Payments', 'VFS Tracker', 'Post Travel']
    },
    {
      id: 3,
      name: 'Global Trade Admin',
      division: 'Global Trade Division',
      icon: Globe,
      members: 2,
      accessLevel: 'Trade ERP Operations',
      desc: 'Oversees international freight shipments, trade CRM, commercial invoices, packing lists, bills of lading, certificates, letters of credit (LC), and multi-currency workflows.',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      modules: ['Shipment Tracking', 'Trade CRM', 'Commercial Invoice', 'Packing List', 'Bill of Lading', 'Certificates', 'LC & Currency']
    },
    {
      id: 4,
      name: 'Rimi Frozen Admin',
      division: 'Rimi Frozen Distribution',
      icon: Snowflake,
      members: 4,
      accessLevel: 'FMCG & Logistics Control',
      desc: 'Manages distributors, retailers, wholesalers, warehouse cold chain inventory, batch tracking, expiry date monitoring, sales dispatch, and cash collections.',
      badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      modules: ['Distributor CRM', 'Retailers & Wholesalers', 'Warehouse Cold Storage', 'Batch & Expiry Alert', 'Sales & Deliveries', 'Collections']
    },
    {
      id: 5,
      name: 'Ferex Digital Admin',
      division: 'Ferex Digital Agency',
      icon: Monitor,
      members: 3,
      accessLevel: 'Agency & Project Deliverables',
      desc: 'Directs digital agency client accounts, engineering deliverables, milestones, sprint tasks, client invoices, milestone payouts, files, and review workflows.',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      modules: ['Client Accounts', 'Project Sprint Milestones', 'Task Management', 'Agency Invoicing', 'Deliverables Review', 'Time Tracking']
    },
  ]);

  const [newRole, setNewRole] = useState({ name: '', division: '', desc: '', accessLevel: 'Standard Division Control' });

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
      icon: Shield,
      members: 0,
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
      modules: ['Custom Scope Module', 'Read/Write Operations']
    };
    setRoles([...roles, created]);
    setShowAddModal(false);
    showToastMsg(`Role "${newRole.name}" created!`);
    setNewRole({ name: '', division: '', desc: '', accessLevel: 'Standard Division Control' });
  };

  return (
    <div className="space-y-6 text-left antialiased">
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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-[#6A1B2E]" /> Enterprise Roles & RBAC Matrix
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Super Admin Console • Permission boundaries and operational scopes across all 4 enterprise divisions.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-white text-xs font-bold shadow-md" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Define Custom Role
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <Card key={role.id} className="p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[#6A1B2E]">
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 leading-tight">{role.name}</h3>
                      <p className="text-[10.5px] font-bold text-slate-400">{role.division}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${role.badge}`}>
                    {role.members} Admins
                  </span>
                </div>

                <div className="mb-3">
                  <span className="text-[10.5px] font-extrabold uppercase text-[#6A1B2E] tracking-wider block mb-1">
                    {role.accessLevel}
                  </span>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    {role.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Authorized Modules:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {role.modules.map((m, mIdx) => (
                      <span key={mIdx} className="text-[10.5px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/60">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
                <span className="text-emerald-600 font-extrabold flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Policy Enforced
                </span>
                <button
                  onClick={() => showToastMsg(`Permissions synced for ${role.name}`)}
                  className="text-[#6A1B2E] hover:underline cursor-pointer text-xs font-black"
                >
                  Verify Audit
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* CREATE NEW ROLE MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-left space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">Define Enterprise Role</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateRole} className="space-y-3">
                <Input
                  label="Role Title"
                  placeholder="e.g. Lead Logistics Coordinator"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  required
                />

                <Input
                  label="Target Division"
                  placeholder="e.g. Rimi Frozen Logistics"
                  value={newRole.division}
                  onChange={(e) => setNewRole({ ...newRole, division: e.target.value })}
                  required
                />

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role Description</label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of responsibilities and scope"
                    value={newRole.desc}
                    onChange={(e) => setNewRole({ ...newRole, desc: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:border-[#6A1B2E]"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-white font-bold">
                    Save Role
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
