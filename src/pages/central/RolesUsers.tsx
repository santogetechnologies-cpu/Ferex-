import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Plus, Search, Trash2, X, CheckCircle2,
  GraduationCap, Globe, Snowflake, Monitor, Crown, Copy, RefreshCw,
  Users, Briefcase, Truck, Box, UserCheck, Shield, Lock
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { isSuperAdmin } from '../../lib/roleRouter';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  division: string;
  divisionLabel: string;
  targetRoute: string;
  status: 'Active' | 'Inactive';
  password?: string;
  created_at: string;
  initials: string;
}

// ─── Division Config ─────────────────────────────────────────────────────────

const DIVISION_CONFIG: Record<string, { label: string; route: string; icon: any; badgeColor: string; category: string }> = {
  superadmin: { label: 'Central Super Admin', route: '/central/dashboard', icon: Crown, badgeColor: 'text-amber-800 bg-amber-50 border-amber-300', category: 'Central HQ' },
  super_admin: { label: 'Central Super Admin', route: '/central/dashboard', icon: Crown, badgeColor: 'text-amber-800 bg-amber-50 border-amber-300', category: 'Central HQ' },
  central: { label: 'Central Super Admin', route: '/central/dashboard', icon: Crown, badgeColor: 'text-amber-800 bg-amber-50 border-amber-300', category: 'Central HQ' },
  education_admin: { label: 'Ferex Education Admin', route: '/admin/dashboard', icon: GraduationCap, badgeColor: 'text-rose-700 bg-rose-50 border-rose-200', category: 'Ferex Education' },
  education: { label: 'Ferex Education Admin', route: '/admin/dashboard', icon: GraduationCap, badgeColor: 'text-rose-700 bg-rose-50 border-rose-200', category: 'Ferex Education' },
  admin: { label: 'Ferex Education Admin', route: '/admin/dashboard', icon: GraduationCap, badgeColor: 'text-rose-700 bg-rose-50 border-rose-200', category: 'Ferex Education' },
  counselor: { label: 'Admissions Counselor', route: '/staff/dashboard', icon: Users, badgeColor: 'text-purple-700 bg-purple-50 border-purple-200', category: 'Ferex Education (Staff)' },
  staff: { label: 'Admissions Staff', route: '/staff/dashboard', icon: Users, badgeColor: 'text-purple-700 bg-purple-50 border-purple-200', category: 'Ferex Education (Staff)' },
  digital_admin: { label: 'Ferex Digital Admin', route: '/digital/dashboard', icon: Monitor, badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200', category: 'Ferex Digital' },
  digital: { label: 'Ferex Digital Admin', route: '/digital/dashboard', icon: Monitor, badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200', category: 'Ferex Digital' },
  project_manager: { label: 'Digital Project Manager', route: '/digital/dashboard', icon: Briefcase, badgeColor: 'text-teal-700 bg-teal-50 border-teal-200', category: 'Ferex Digital (Staff)' },
  trade_admin: { label: 'Global Trade Admin', route: '/trade/dashboard', icon: Globe, badgeColor: 'text-indigo-700 bg-indigo-50 border-indigo-200', category: 'Global Trade' },
  trade: { label: 'Global Trade Admin', route: '/trade/dashboard', icon: Globe, badgeColor: 'text-indigo-700 bg-indigo-50 border-indigo-200', category: 'Global Trade' },
  logistics_officer: { label: 'Trade Logistics Officer', route: '/trade/dashboard', icon: Truck, badgeColor: 'text-blue-700 bg-blue-50 border-blue-200', category: 'Global Trade (Staff)' },
  rimi_admin: { label: 'Rimi Frozen Admin', route: '/rimi/dashboard', icon: Snowflake, badgeColor: 'text-cyan-700 bg-cyan-50 border-cyan-200', category: 'Rimi Frozen' },
  rimi: { label: 'Rimi Frozen Admin', route: '/rimi/dashboard', icon: Snowflake, badgeColor: 'text-cyan-700 bg-cyan-50 border-cyan-200', category: 'Rimi Frozen' },
  operations_manager: { label: 'Warehouse & Operations Manager', route: '/rimi/dashboard', icon: Box, badgeColor: 'text-sky-700 bg-sky-50 border-sky-200', category: 'Rimi Frozen (Staff)' },
};

// ─── System Roles (RBAC Cards) ────────────────────────────────────────────────

const SYSTEM_ROLES = [
  {
    id: 1,
    name: 'Central Super Admin',
    division: 'All 4 Enterprise Apps',
    icon: Crown,
    members: null as null | number,
    roleKey: ['superadmin', 'super_admin', 'central'],
    accessLevel: 'Full Enterprise Command',
    desc: 'Master governance across Ferex Education, Global Trade ERP, Rimi Frozen Distribution, and Ferex Digital. Controls user provisioning, financial ledgers, and division delegation.',
    badge: 'bg-amber-50 text-amber-800 border-amber-300',
    modules: ['User & Admin Management', '4-App Executive Switcher', 'Financial Payouts', 'Audit Logs', 'Global SLA Governance'],
  },
  {
    id: 2,
    name: 'Ferex Education Admin',
    division: 'Ferex Education Division',
    icon: GraduationCap,
    members: null as null | number,
    roleKey: ['education_admin', 'education', 'admin'],
    accessLevel: 'Education Full Control',
    desc: 'Controls international students, university alliances, application workflows, document legalization (NAWA), tuition fees, and VFS visa tracking.',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    modules: ['Students Directory', 'University Applications', 'Document Vault', 'Tuition Payments', 'VFS Tracker', 'Post Travel'],
  },
  {
    id: 3,
    name: 'Admissions Staff / Counselor',
    division: 'Ferex Education (Staff)',
    icon: Users,
    members: null as null | number,
    roleKey: ['counselor', 'staff'],
    accessLevel: 'Admissions Operations',
    desc: 'Manages assigned student caseload, NAWA submissions, document review, meeting scheduling, and progress tracking within the Education portal.',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    modules: ['Assigned Students', 'Tasks & Calendar', 'Document Review', 'Meeting Management', 'Support Tickets'],
  },
  {
    id: 4,
    name: 'Global Trade Admin',
    division: 'Global Trade Division',
    icon: Globe,
    members: null as null | number,
    roleKey: ['trade_admin', 'trade'],
    accessLevel: 'Trade ERP Operations',
    desc: 'Oversees international freight shipments, trade CRM, commercial invoices, packing lists, bills of lading, certificates, letters of credit (LC), and multi-currency workflows.',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    modules: ['Shipment Tracking', 'Trade CRM', 'Commercial Invoice', 'Packing List', 'Bill of Lading', 'Certificates', 'LC & Currency'],
  },
  {
    id: 5,
    name: 'Trade Logistics Officer',
    division: 'Global Trade (Staff)',
    icon: Truck,
    members: null as null | number,
    roleKey: ['logistics_officer'],
    accessLevel: 'Cargo & Customs Desk',
    desc: 'Handles cargo tracking, customs documentation, shipment status updates, and client communication within the Trade ERP platform.',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    modules: ['Shipment Tracking', 'Customs Docs', 'Client Updates', 'Cargo Manifest'],
  },
  {
    id: 6,
    name: 'Rimi Frozen Admin',
    division: 'Rimi Frozen Distribution',
    icon: Snowflake,
    members: null as null | number,
    roleKey: ['rimi_admin', 'rimi'],
    accessLevel: 'FMCG & Logistics Control',
    desc: 'Manages distributors, retailers, wholesalers, warehouse cold chain inventory, batch tracking, expiry date monitoring, sales dispatch, and cash collections.',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    modules: ['Distributor CRM', 'Retailers & Wholesalers', 'Warehouse Cold Storage', 'Batch & Expiry Alert', 'Sales & Deliveries', 'Collections'],
  },
  {
    id: 7,
    name: 'Rimi Warehouse Lead',
    division: 'Rimi Frozen (Staff)',
    icon: Box,
    members: null as null | number,
    roleKey: ['operations_manager'],
    accessLevel: 'Cold Storage Operations',
    desc: 'Oversees cold storage hubs, fleet dispatch, batch tracking, expiry monitoring, and delivery route management across distribution zones.',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    modules: ['Warehouse Management', 'Fleet Dispatch', 'Batch Tracking', 'Delivery Routes'],
  },
  {
    id: 8,
    name: 'Ferex Digital Admin',
    division: 'Ferex Digital Agency',
    icon: Monitor,
    members: null as null | number,
    roleKey: ['digital_admin', 'digital'],
    accessLevel: 'Agency & Project Deliverables',
    desc: 'Directs digital agency client accounts, engineering deliverables, milestones, sprint tasks, client invoices, milestone payouts, files, and review workflows.',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    modules: ['Client Accounts', 'Project Sprint Milestones', 'Task Management', 'Agency Invoicing', 'Deliverables Review', 'Time Tracking'],
  },
  {
    id: 9,
    name: 'Digital Project Manager',
    division: 'Ferex Digital (Staff)',
    icon: Briefcase,
    members: null as null | number,
    roleKey: ['project_manager'],
    accessLevel: 'Sprint & Client Lead',
    desc: 'Leads client sprint delivery, milestone tracking, task assignment, client portal access provisioning, and invoice milestones for the Digital Agency.',
    badge: 'bg-teal-50 text-teal-700 border-teal-200',
    modules: ['Sprint Management', 'Client Tickets', 'Milestone Tracking', 'Deliverables Review'],
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export const RolesUsers: React.FC = () => {
  const { provisionDivisionAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [adminList, setAdminList] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New user form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('counselor');
  const [formError, setFormError] = useState('');

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // ─── Load Users ─────────────────────────────────────────────────────────────

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .neq('role', 'student')
        .order('created_at', { ascending: false });

      if (error) console.warn('Error loading users:', error.message);

      const list: AdminAccount[] = [];

      (data || []).forEach((u: any) => {
        let cleanRole = (u.role || '').toLowerCase().trim();
        const cleanEmail = (u.email || '').toLowerCase().trim();

        if (isSuperAdmin(u.role, u.email)) {
          cleanRole = 'superadmin';
        } else if (cleanRole === 'counselor' || cleanEmail.includes('counselor')) {
          cleanRole = 'counselor';
        } else if (cleanRole === 'project_manager' || cleanEmail.includes('pm')) {
          cleanRole = 'project_manager';
        } else if (cleanRole === 'logistics_officer' || cleanEmail.includes('logistics')) {
          cleanRole = 'logistics_officer';
        } else if (cleanRole === 'operations_manager' || cleanEmail.includes('ops')) {
          cleanRole = 'operations_manager';
        } else if (cleanEmail.includes('ferexedu') || cleanRole === 'education' || cleanRole === 'education_admin') {
          cleanRole = 'education_admin';
        } else if (cleanEmail.includes('ferextrade') || cleanRole === 'trade' || cleanRole === 'trade_admin') {
          cleanRole = 'trade_admin';
        } else if (cleanEmail.includes('ferexrimi') || cleanRole === 'rimi' || cleanRole === 'rimi_admin') {
          cleanRole = 'rimi_admin';
        } else if (cleanEmail.includes('ferexdigital') || cleanRole === 'digital' || cleanRole === 'digital_admin') {
          cleanRole = 'digital_admin';
        }

        const cfg = DIVISION_CONFIG[cleanRole] || DIVISION_CONFIG.superadmin;

        let savedPass: string | undefined = undefined;
        try {
          const localCred = localStorage.getItem(`ferex_admin_cred_${(u.email || '').toLowerCase()}`);
          if (localCred) savedPass = JSON.parse(localCred).password;
        } catch {}

        list.push({
          id: u.id,
          name: u.full_name || (u.email || '').split('@')[0],
          email: u.email,
          role: cleanRole,
          department: u.department || cfg.category,
          division: cleanRole,
          divisionLabel: cfg.label,
          targetRoute: cfg.route,
          status: 'Active',
          password: savedPass,
          created_at: u.created_at || new Date().toISOString(),
          initials: (u.full_name || u.email || 'AD').slice(0, 2).toUpperCase(),
        });
      });

      setAdminList(list);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Realtime Subscription ───────────────────────────────────────────────────

  useEffect(() => {
    loadAdmins();
    const channel = supabase
      .channel('roles-users-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => loadAdmins())
      .subscribe();

    const handleCreated = () => loadAdmins();
    window.addEventListener('ferex_admin_created', handleCreated);
    window.addEventListener('ferex_staff_change', handleCreated);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_admin_created', handleCreated);
      window.removeEventListener('ferex_staff_change', handleCreated);
    };
  }, [loadAdmins]);

  // ─── Computed role member counts ─────────────────────────────────────────────

  const rolesWithCounts = SYSTEM_ROLES.map(role => ({
    ...role,
    members: adminList.filter(u => role.roleKey.includes(u.role)).length,
  }));

  // ─── Create User ─────────────────────────────────────────────────────────────

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim()) { setFormError('Full name is required.'); return; }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { setFormError('Please provide a valid email address.'); return; }
    if (!password || password.length < 6) { setFormError('Password must be at least 6 characters long.'); return; }

    setIsSubmitting(true);
    const departmentName = DIVISION_CONFIG[selectedRole]?.category || 'Enterprise';
    const result = await provisionDivisionAdmin(
      email.trim(), password, fullName.trim(), selectedRole,
      { department: departmentName, phone: phone.trim() }
    );
    setIsSubmitting(false);

    if (result.error) { setFormError(result.error); return; }

    showToastMsg(`✅ Provisioned ${fullName.trim()} as ${DIVISION_CONFIG[selectedRole]?.label || selectedRole}!`);
    setShowAddModal(false);
    setFullName(''); setEmail(''); setPassword(''); setPhone(''); setSelectedRole('counselor');
    loadAdmins();
  };

  // ─── Delete User ─────────────────────────────────────────────────────────────

  const handleDelete = async (id: string, emailToDelete: string) => {
    if (!window.confirm(`Remove login access for ${emailToDelete}?`)) return;
    try {
      await supabase.from('users').delete().eq('id', id);
      localStorage.removeItem(`ferex_admin_cred_${emailToDelete.toLowerCase()}`);
      try {
        const raw = localStorage.getItem('ferex_deleted_staff_ids') || '[]';
        localStorage.setItem('ferex_deleted_staff_ids', JSON.stringify([...JSON.parse(raw), id, emailToDelete.toLowerCase()]));
      } catch {}
      setAdminList(prev => prev.filter(a => a.id !== id));
      showToastMsg(`Login for ${emailToDelete} removed.`);
      window.dispatchEvent(new Event('ferex_staff_change'));
      loadAdmins();
    } catch (err: any) {
      showToastMsg(`Failed to delete: ${err.message || 'Error'}`);
    }
  };

  const copyCredentials = (adm: AdminAccount) => {
    const text = `Email: ${adm.email}\nPassword: ${adm.password || 'Configured in Supabase Auth'}\nRole: ${adm.divisionLabel}\nPortal: ${window.location.origin}/#/login`;
    navigator.clipboard.writeText(text);
    showToastMsg('📋 Login credentials copied to clipboard!');
  };

  // ─── Filtered Users ──────────────────────────────────────────────────────────

  const filteredAdmins = adminList.filter(a => {
    const matchesFilter =
      divisionFilter === 'All' ||
      (divisionFilter === 'Education' && (a.role === 'education_admin' || a.role === 'education' || a.role === 'admin' || a.role === 'counselor' || a.role === 'staff')) ||
      (divisionFilter === 'Trade' && (a.role === 'trade' || a.role === 'trade_admin' || a.role === 'logistics_officer')) ||
      (divisionFilter === 'Rimi' && (a.role === 'rimi' || a.role === 'rimi_admin' || a.role === 'operations_manager')) ||
      (divisionFilter === 'Digital' && (a.role === 'digital' || a.role === 'digital_admin' || a.role === 'project_manager')) ||
      (divisionFilter === 'SuperAdmin' && (a.role === 'superadmin' || a.role === 'central' || a.role === 'super_admin'));

    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.divisionLabel.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // ─── Role Selector options ────────────────────────────────────────────────────

  const roleOptions = [
    {
      group: 'Ferex Education Roles',
      groupColor: 'text-rose-800 bg-rose-50 border-rose-200',
      options: [
        { role: 'counselor', label: 'Admissions Counselor', desc: 'Assigned to students in Education portal', icon: Users, color: 'border-purple-300 text-purple-900 bg-purple-50/60' },
        { role: 'education_admin', label: 'Ferex Education Admin', desc: 'Full Education Portal control & admissions', icon: GraduationCap, color: 'border-rose-300 text-rose-900 bg-rose-50/60' },
      ],
    },
    {
      group: 'Ferex Digital Roles',
      groupColor: 'text-emerald-800 bg-emerald-50 border-emerald-200',
      options: [
        { role: 'project_manager', label: 'Digital Project Manager', desc: 'Sprint lead, client tickets & milestones', icon: Briefcase, color: 'border-teal-300 text-teal-900 bg-teal-50/60' },
        { role: 'digital_admin', label: 'Ferex Digital Admin', desc: 'Full Digital agency admin & retainers', icon: Monitor, color: 'border-emerald-300 text-emerald-900 bg-emerald-50/60' },
      ],
    },
    {
      group: 'Trade & Logistics Roles',
      groupColor: 'text-indigo-800 bg-indigo-50 border-indigo-200',
      options: [
        { role: 'logistics_officer', label: 'Trade Logistics Officer', desc: 'Cargo tracking, shipping & customs', icon: Truck, color: 'border-blue-300 text-blue-900 bg-blue-50/60' },
        { role: 'trade_admin', label: 'Global Trade Admin', desc: 'Full Trade CRM & LC settlements', icon: Globe, color: 'border-indigo-300 text-indigo-900 bg-indigo-50/60' },
        { role: 'operations_manager', label: 'Rimi Warehouse Lead', desc: 'Cold storage hubs, batch & fleet', icon: Box, color: 'border-sky-300 text-sky-900 bg-sky-50/60' },
        { role: 'rimi_admin', label: 'Rimi Frozen Admin', desc: 'Full FMCG & Cold chain distribution', icon: Snowflake, color: 'border-cyan-300 text-cyan-900 bg-cyan-50/60' },
      ],
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Lock className="w-6 h-6 text-[#6A1B2E]" /> Roles & Users
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Super Admin Console • Manage system role definitions and provision user accounts across all 4 enterprise divisions.
          </p>
        </div>
        {activeTab === 'users' && (
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={loadAdmins} className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 flex items-center gap-1.5 cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
            <Button size="sm" onClick={() => setShowAddModal(true)} className="bg-[#6A1B2E] hover:bg-[#521221] text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer">
              <Plus className="w-4 h-4" /> Provision User
            </Button>
          </div>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit border border-slate-200/80">
        {[
          { key: 'users', label: 'Users', icon: Users },
          { key: 'roles', label: 'Roles', icon: Shield },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-[#6A1B2E] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.key === 'users' && (
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${activeTab === 'users' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {adminList.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── USERS TAB ─────────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Accounts', count: adminList.length, color: 'text-slate-900 bg-slate-100' },
              { label: 'Super Admins', count: adminList.filter(a => a.role === 'superadmin' || a.role === 'central').length, color: 'text-amber-800 bg-amber-50' },
              { label: 'Education', count: adminList.filter(a => ['education_admin', 'education', 'admin', 'counselor', 'staff'].includes(a.role)).length, color: 'text-rose-700 bg-rose-50' },
              { label: 'Digital Team', count: adminList.filter(a => ['digital_admin', 'digital', 'project_manager'].includes(a.role)).length, color: 'text-emerald-700 bg-emerald-50' },
              { label: 'Trade Team', count: adminList.filter(a => ['trade_admin', 'trade', 'logistics_officer'].includes(a.role)).length, color: 'text-indigo-700 bg-indigo-50' },
              { label: 'Rimi Team', count: adminList.filter(a => ['rimi_admin', 'rimi', 'operations_manager'].includes(a.role)).length, color: 'text-cyan-700 bg-cyan-50' },
            ].map((s, idx) => (
              <div key={idx} className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">{s.label}</span>
                <span className={`text-xl font-black mt-1 block ${s.color.split(' ')[0]}`}>{s.count}</span>
              </div>
            ))}
          </div>

          {/* Filter & Search */}
          <Card className="p-3 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, role, division..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                />
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none w-full md:w-auto">
                {['All', 'SuperAdmin', 'Education', 'Digital', 'Trade', 'Rimi'].map(div => (
                  <button
                    key={div}
                    onClick={() => setDivisionFilter(div)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      divisionFilter === div ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {div}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Users Table */}
          <Card className="border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-3 px-4">User & Contact</th>
                    <th className="py-3 px-4">Role & Portal</th>
                    <th className="py-3 px-4">Division</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-6 h-6 border-2 border-[#6A1B2E] border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs font-bold text-slate-400">Loading user accounts...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredAdmins.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400 font-bold text-xs">
                        No user accounts found matching the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAdmins.map((adm) => {
                      const cfg = DIVISION_CONFIG[adm.role] || DIVISION_CONFIG.superadmin;
                      const IconComp = cfg.icon;

                      return (
                        <tr key={adm.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                                {adm.initials}
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-900 text-xs">{adm.name}</p>
                                <p className="text-[11px] font-semibold text-slate-400">{adm.email}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border flex items-center gap-1.5 w-fit ${cfg.badgeColor}`}>
                              <IconComp className="w-3.5 h-3.5 shrink-0" />
                              {adm.divisionLabel}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 font-bold text-[11px]">
                            {adm.department || cfg.category}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ● Active
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => copyCredentials(adm)}
                                title="Copy Login Credentials"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(adm.id, adm.email)}
                                title="Revoke & Delete Login"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── ROLES TAB ─────────────────────────────────────────────────────────── */}
      {activeTab === 'roles' && (
        <div className="space-y-5">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900">System-Defined Role Matrix</p>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                These roles are system-defined and enforced at the database level. Each role has a fixed scope of access modules within its assigned enterprise division. User counts reflect current live provisioned accounts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {rolesWithCounts.map((role) => {
              const Icon = role.icon;
              return (
                <Card key={role.id} className="p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-[#6A1B2E]">
                          <Icon className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900 leading-tight">{role.name}</h3>
                          <p className="text-[10.5px] font-bold text-slate-400">{role.division}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${role.badge}`}>
                        {role.members} Users
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

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-emerald-600 font-extrabold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Policy Enforced
                    </span>
                    <button
                      onClick={() => { setActiveTab('users'); setDivisionFilter(
                        role.id === 1 ? 'SuperAdmin' :
                        [2,3].includes(role.id) ? 'Education' :
                        [4,5].includes(role.id) ? 'Trade' :
                        [6,7].includes(role.id) ? 'Rimi' : 'Digital'
                      ); }}
                      className="text-[#6A1B2E] hover:underline cursor-pointer text-xs font-black"
                    >
                      View Users →
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PROVISION USER MODAL ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 text-left space-y-4 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Provision New User</h3>
                    <p className="text-xs font-semibold text-slate-400">Creates authenticated login in Supabase with assigned role & scope</p>
                  </div>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 shrink-0">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4 overflow-y-auto pr-1 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Full Name" placeholder="e.g. Arun Patel" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  <Input label="Phone Number (Optional)" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Login Email Address" type="email" placeholder="e.g. arun@ferex.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <Input label="Login Password" type="password" showPasswordToggle={true} placeholder="Minimum 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>

                {/* Role Selector */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-2 uppercase tracking-wider">
                    Select Role & Division Scope:
                  </label>
                  <div className="space-y-3">
                    {roleOptions.map(group => (
                      <div key={group.group}>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border mb-1.5 inline-block ${group.groupColor}`}>
                          {group.group}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                          {group.options.map(opt => {
                            const OptIcon = opt.icon;
                            return (
                              <button
                                key={opt.role}
                                type="button"
                                onClick={() => setSelectedRole(opt.role)}
                                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2 ${
                                  selectedRole === opt.role
                                    ? `${opt.color} ring-2 ring-[#6A1B2E] font-black shadow-xs`
                                    : 'border-slate-200 bg-white hover:bg-slate-50'
                                }`}
                              >
                                <OptIcon className="w-4 h-4 shrink-0 mt-0.5 text-[#6A1B2E]" />
                                <div>
                                  <p className="text-xs font-extrabold">{opt.label}</p>
                                  <p className="text-[10px] text-slate-500 font-medium">{opt.desc}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Central Super Admin */}
                    <button
                      type="button"
                      onClick={() => setSelectedRole('superadmin')}
                      className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                        selectedRole === 'superadmin'
                          ? 'border-amber-300 bg-amber-50/80 ring-2 ring-amber-600 font-black shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <Crown className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                      <div>
                        <p className="text-xs font-black text-amber-900">Central Super Admin</p>
                        <p className="text-[10.5px] text-amber-700/80 font-medium">Unrestricted master access across all 4 enterprise applications, global finance & user governance</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)} className="text-xs font-bold cursor-pointer">
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isSubmitting} className="bg-[#6A1B2E] hover:bg-[#521221] text-white text-xs font-bold shadow-md cursor-pointer">
                    {isSubmitting ? 'Activating...' : 'Activate Login'}
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
