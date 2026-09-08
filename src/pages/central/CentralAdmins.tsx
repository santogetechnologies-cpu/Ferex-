import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Plus, Search, Trash2, X, CheckCircle2,
  GraduationCap, Globe, Snowflake, Monitor, Crown, Copy, RefreshCw,
  Users, Briefcase, Truck, Box
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { isSuperAdmin } from '../../lib/roleRouter';

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

const DIVISION_CONFIG: Record<string, { label: string; route: string; icon: any; badgeColor: string; category: string }> = {
  superadmin: {
    label: 'Central Super Admin',
    route: '/central/dashboard',
    icon: Crown,
    badgeColor: 'text-amber-800 bg-amber-50 border-amber-300',
    category: 'Central HQ',
  },
  super_admin: {
    label: 'Central Super Admin',
    route: '/central/dashboard',
    icon: Crown,
    badgeColor: 'text-amber-800 bg-amber-50 border-amber-300',
    category: 'Central HQ',
  },
  central: {
    label: 'Central Super Admin',
    route: '/central/dashboard',
    icon: Crown,
    badgeColor: 'text-amber-800 bg-amber-50 border-amber-300',
    category: 'Central HQ',
  },
  education_admin: {
    label: 'Ferex Education Admin',
    route: '/admin/dashboard',
    icon: GraduationCap,
    badgeColor: 'text-rose-700 bg-rose-50 border-rose-200',
    category: 'Ferex Education',
  },
  education: {
    label: 'Ferex Education Admin',
    route: '/admin/dashboard',
    icon: GraduationCap,
    badgeColor: 'text-rose-700 bg-rose-50 border-rose-200',
    category: 'Ferex Education',
  },
  counselor: {
    label: 'Admissions Counselor',
    route: '/staff/dashboard',
    icon: Users,
    badgeColor: 'text-purple-700 bg-purple-50 border-purple-200',
    category: 'Ferex Education (Staff)',
  },
  staff: {
    label: 'Admissions Staff',
    route: '/staff/dashboard',
    icon: Users,
    badgeColor: 'text-purple-700 bg-purple-50 border-purple-200',
    category: 'Ferex Education (Staff)',
  },
  digital_admin: {
    label: 'Ferex Digital Admin',
    route: '/digital/dashboard',
    icon: Monitor,
    badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    category: 'Ferex Digital',
  },
  digital: {
    label: 'Ferex Digital Admin',
    route: '/digital/dashboard',
    icon: Monitor,
    badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    category: 'Ferex Digital',
  },
  project_manager: {
    label: 'Digital Project Manager',
    route: '/digital/dashboard',
    icon: Briefcase,
    badgeColor: 'text-teal-700 bg-teal-50 border-teal-200',
    category: 'Ferex Digital (Staff)',
  },
  trade_admin: {
    label: 'Global Trade Admin',
    route: '/trade/dashboard',
    icon: Globe,
    badgeColor: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    category: 'Global Trade',
  },
  trade: {
    label: 'Global Trade Admin',
    route: '/trade/dashboard',
    icon: Globe,
    badgeColor: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    category: 'Global Trade',
  },
  logistics_officer: {
    label: 'Trade Logistics Officer',
    route: '/trade/dashboard',
    icon: Truck,
    badgeColor: 'text-blue-700 bg-blue-50 border-blue-200',
    category: 'Global Trade (Staff)',
  },
  rimi_admin: {
    label: 'Rimi Frozen Admin',
    route: '/rimi/dashboard',
    icon: Snowflake,
    badgeColor: 'text-cyan-700 bg-cyan-50 border-cyan-200',
    category: 'Rimi Frozen',
  },
  rimi: {
    label: 'Rimi Frozen Admin',
    route: '/rimi/dashboard',
    icon: Snowflake,
    badgeColor: 'text-cyan-700 bg-cyan-50 border-cyan-200',
    category: 'Rimi Frozen',
  },
  operations_manager: {
    label: 'Warehouse & Operations Manager',
    route: '/rimi/dashboard',
    icon: Box,
    badgeColor: 'text-sky-700 bg-sky-50 border-sky-200',
    category: 'Rimi Frozen (Staff)',
  },
};

export const CentralAdmins: React.FC = () => {
  const { provisionDivisionAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [adminList, setAdminList] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New admin form state
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

  // 100% Realtime Live Query from Supabase Database
  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all administrative & staff accounts directly from Supabase public.users
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .neq('role', 'student')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error loading administrators from Supabase:', error.message);
      }

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

        // Check if there are cached credentials saved locally by Super Admin for password quick copy
        let savedPass: string | undefined = undefined;
        try {
          const localCred = localStorage.getItem(`ferex_admin_cred_${(u.email || '').toLowerCase()}`);
          if (localCred) {
            savedPass = JSON.parse(localCred).password;
          }
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
      console.error('Failed to load realtime admins:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Supabase Realtime Live Changes Subscription
  useEffect(() => {
    loadAdmins();

    const channel = supabase
      .channel('central-realtime-admins')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          loadAdmins();
        }
      )
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

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim()) {
      setFormError('Full name is required.');
      return;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setFormError('Please provide a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    const departmentName = DIVISION_CONFIG[selectedRole]?.category || 'Enterprise';
    const result = await provisionDivisionAdmin(
      email.trim(),
      password,
      fullName.trim(),
      selectedRole,
      { department: departmentName, phone: phone.trim() }
    );
    setIsSubmitting(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    showToastMsg(`✅ Provisioned ${fullName.trim()} as ${DIVISION_CONFIG[selectedRole]?.label || selectedRole}! Credentials active.`);
    setShowAddModal(false);
    setFullName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setSelectedRole('counselor');
    loadAdmins();
  };

  const handleDelete = async (id: string, emailToDelete: string) => {
    if (!window.confirm(`Are you sure you want to remove administrator / staff login for ${emailToDelete}?`)) {
      return;
    }

    try {
      await supabase.from('users').delete().eq('id', id);
      localStorage.removeItem(`ferex_admin_cred_${emailToDelete.toLowerCase()}`);
      
      // Update deleted tracking
      try {
        const deletedRaw = localStorage.getItem('ferex_deleted_staff_ids') || '[]';
        const parsed = JSON.parse(deletedRaw);
        localStorage.setItem('ferex_deleted_staff_ids', JSON.stringify([...parsed, id, emailToDelete.toLowerCase()]));
      } catch {}

      setAdminList(prev => prev.filter(a => a.id !== id && a.email.toLowerCase() !== emailToDelete.toLowerCase()));
      showToastMsg(`Login for ${emailToDelete} removed.`);
      
      window.dispatchEvent(new Event('ferex_staff_change'));
      window.dispatchEvent(new Event('storage'));
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

  const filteredAdmins = adminList.filter(a => {
    const matchesFilter =
      divisionFilter === 'All' ||
      (divisionFilter === 'Education' && (a.role === 'education_admin' || a.role === 'education' || a.role === 'counselor' || a.role === 'staff')) ||
      (divisionFilter === 'Counselors' && (a.role === 'counselor' || a.role === 'staff')) ||
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

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast Feedback */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#6A1B2E]" /> Universal Admin & Staff Governance
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Super Admin Console • Real-time live creation and management of Division Admins and Staff logins (Admissions Counselors, Digital PMs, Trade Officers).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={loadAdmins}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Live
          </Button>

          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="bg-[#6A1B2E] hover:bg-[#521221] text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Provision Admin or Staff
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Logins', count: adminList.length, color: 'text-slate-900 bg-slate-100' },
          { label: 'Super Admins', count: adminList.filter(a => a.role === 'superadmin' || a.role === 'central').length, color: 'text-amber-800 bg-amber-50' },
          { label: 'Education Admins', count: adminList.filter(a => a.role === 'education_admin' || a.role === 'education').length, color: 'text-rose-700 bg-rose-50' },
          { label: 'Counselors / Staff', count: adminList.filter(a => a.role === 'counselor' || a.role === 'staff').length, color: 'text-purple-700 bg-purple-50' },
          { label: 'Digital Team', count: adminList.filter(a => a.role === 'digital_admin' || a.role === 'project_manager').length, color: 'text-emerald-700 bg-emerald-50' },
          { label: 'Trade & Rimi Team', count: adminList.filter(a => a.role === 'trade_admin' || a.role === 'logistics_officer' || a.role === 'rimi_admin' || a.role === 'operations_manager').length, color: 'text-indigo-700 bg-indigo-50' },
        ].map((s, idx) => (
          <div key={idx} className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">{s.label}</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">{s.count}</span>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-3 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email address, division role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none w-full md:w-auto">
            {['All', 'SuperAdmin', 'Education', 'Counselors', 'Digital', 'Trade', 'Rimi'].map((div) => (
              <button
                key={div}
                onClick={() => setDivisionFilter(div)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  divisionFilter === div
                    ? 'bg-[#6A1B2E] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {div}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Realtime Table of Admins & Staff */}
      <Card className="border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                <th className="py-3 px-4">User & Contact</th>
                <th className="py-3 px-4">Role & App Portal</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Credentials & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">
                    Querying Supabase live user accounts...
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">
                    No administrator or staff logins found matching criteria.
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
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border flex items-center gap-1.5 ${cfg.badgeColor}`}>
                            <IconComp className="w-3.5 h-3.5 shrink-0" />
                            {adm.divisionLabel}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-bold">
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

      {/* PROVISION DIVISION ADMIN OR STAFF MODAL */}
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
                  <div className="w-9 h-9 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Provision Admin or Staff Account</h3>
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

              <form onSubmit={handleCreateAdmin} className="space-y-4 overflow-y-auto pr-1 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Full Name"
                    placeholder="e.g. Arun Patel / Sarah Jenkins"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />

                  <Input
                    label="Phone Number (Optional)"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Login Email Address"
                    type="email"
                    placeholder="e.g. arun.counselor@ferex.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <Input
                    label="Login Password"
                    type="password"
                    showPasswordToggle={true}
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-2 uppercase tracking-wider">
                    Select Role & Authority Scope:
                  </label>

                  <div className="space-y-3">
                    {/* Education Suite */}
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 mb-1.5 inline-block">
                        Ferex Education Roles
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                        {[
                          { role: 'counselor', label: 'Admissions Counselor', desc: 'Can be assigned to students in Education CRM', icon: Users, color: 'border-purple-300 text-purple-900 bg-purple-50/60' },
                          { role: 'education_admin', label: 'Ferex Education Admin', desc: 'Full Education Portal control & admissions', icon: GraduationCap, color: 'border-rose-300 text-rose-900 bg-rose-50/60' },
                        ].map(opt => (
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
                            <opt.icon className="w-4 h-4 shrink-0 mt-0.5 text-[#6A1B2E]" />
                            <div>
                              <p className="text-xs font-extrabold">{opt.label}</p>
                              <p className="text-[10px] text-slate-500 font-medium">{opt.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Digital Suite */}
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mb-1.5 inline-block">
                        Ferex Digital Roles
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                        {[
                          { role: 'project_manager', label: 'Digital Project Manager', desc: 'Sprint lead, client tickets & milestones', icon: Briefcase, color: 'border-teal-300 text-teal-900 bg-teal-50/60' },
                          { role: 'digital_admin', label: 'Ferex Digital Admin', desc: 'Full Digital agency admin & retainers', icon: Monitor, color: 'border-emerald-300 text-emerald-900 bg-emerald-50/60' },
                        ].map(opt => (
                          <button
                            key={opt.role}
                            type="button"
                            onClick={() => setSelectedRole(opt.role)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2 ${
                              selectedRole === opt.role
                                ? `${opt.color} ring-2 ring-emerald-600 font-black shadow-xs`
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <opt.icon className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                            <div>
                              <p className="text-xs font-extrabold">{opt.label}</p>
                              <p className="text-[10px] text-slate-500 font-medium">{opt.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Trade & Rimi Suite */}
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 mb-1.5 inline-block">
                        Trade & Logistics Roles
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                        {[
                          { role: 'logistics_officer', label: 'Trade Logistics Officer', desc: 'Cargo tracking, shipping & customs', icon: Truck, color: 'border-blue-300 text-blue-900 bg-blue-50/60' },
                          { role: 'trade_admin', label: 'Global Trade Admin', desc: 'Full Trade CRM & LC settlements', icon: Globe, color: 'border-indigo-300 text-indigo-900 bg-indigo-50/60' },
                          { role: 'operations_manager', label: 'Rimi Warehouse Lead', desc: 'Cold storage hubs, batch & fleet', icon: Box, color: 'border-sky-300 text-sky-900 bg-sky-50/60' },
                          { role: 'rimi_admin', label: 'Rimi Frozen Admin', desc: 'Full FMCG & Cold chain distribution', icon: Snowflake, color: 'border-cyan-300 text-cyan-900 bg-cyan-50/60' },
                        ].map(opt => (
                          <button
                            key={opt.role}
                            type="button"
                            onClick={() => setSelectedRole(opt.role)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2 ${
                              selectedRole === opt.role
                                ? `${opt.color} ring-2 ring-indigo-600 font-black shadow-xs`
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <opt.icon className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600" />
                            <div>
                              <p className="text-xs font-extrabold">{opt.label}</p>
                              <p className="text-[10px] text-slate-500 font-medium">{opt.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Central Super Admin */}
                    <div>
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
                          <p className="text-[10.5px] text-amber-700/80 font-medium">Unrestricted Master Access across all 4 Enterprise applications, global finance & user governance</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddModal(false)}
                    className="text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting}
                    className="bg-[#6A1B2E] hover:bg-[#521221] text-white text-xs font-bold shadow-md cursor-pointer"
                  >
                    {isSubmitting ? 'Activating in Supabase...' : 'Activate Login'}
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
