import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Plus, Search, Mail, Trash2, X, CheckCircle2, Lock,
  Key, GraduationCap, Globe, Snowflake, Monitor, Crown, Copy, ExternalLink, RefreshCw
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useAuth } from '../../contexts/AuthContext';
import { getStaffMembers } from '../../lib/api/students';

interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  division: string;
  divisionLabel: string;
  targetRoute: string;
  status: 'Active' | 'Inactive';
  password?: string;
  created_at: string;
  initials: string;
}

const DIVISION_CONFIG: Record<string, { label: string; route: string; icon: any; badgeColor: string }> = {
  admin: {
    label: 'Ferex Education Admin',
    route: '/admin/dashboard',
    icon: GraduationCap,
    badgeColor: 'text-rose-700 bg-rose-50 border-rose-200',
  },
  education_admin: {
    label: 'Ferex Education Admin',
    route: '/admin/dashboard',
    icon: GraduationCap,
    badgeColor: 'text-rose-700 bg-rose-50 border-rose-200',
  },
  trade: {
    label: 'Global Trade Admin',
    route: '/trade/dashboard',
    icon: Globe,
    badgeColor: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  },
  trade_admin: {
    label: 'Global Trade Admin',
    route: '/trade/dashboard',
    icon: Globe,
    badgeColor: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  },
  rimi: {
    label: 'Rimi Frozen Admin',
    route: '/rimi/dashboard',
    icon: Snowflake,
    badgeColor: 'text-cyan-700 bg-cyan-50 border-cyan-200',
  },
  rimi_admin: {
    label: 'Rimi Frozen Admin',
    route: '/rimi/dashboard',
    icon: Snowflake,
    badgeColor: 'text-cyan-700 bg-cyan-50 border-cyan-200',
  },
  digital: {
    label: 'Ferex Digital Admin',
    route: '/digital/dashboard',
    icon: Monitor,
    badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  digital_admin: {
    label: 'Ferex Digital Admin',
    route: '/digital/dashboard',
    icon: Monitor,
    badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  superadmin: {
    label: 'Central Super Admin',
    route: '/central/dashboard',
    icon: Crown,
    badgeColor: 'text-amber-800 bg-amber-50 border-amber-300',
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
  const [selectedRole, setSelectedRole] = useState<'admin' | 'trade' | 'rimi' | 'digital' | 'superadmin'>('admin');
  const [formError, setFormError] = useState('');

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadAdmins = async () => {
    setLoading(true);
    const list: AdminAccount[] = [];

    // 1. Load from locally provisioned credentials
    const localKeys = Object.keys(localStorage).filter(k => k.startsWith('ferex_admin_cred_'));
    localKeys.forEach(k => {
      try {
        const item = JSON.parse(localStorage.getItem(k) || '{}');
        if (item.email) {
          const cfg = DIVISION_CONFIG[item.role] || DIVISION_CONFIG.admin;
          list.push({
            id: `loc_${item.email}`,
            name: item.fullName || item.email.split('@')[0],
            email: item.email,
            role: item.role,
            division: item.role,
            divisionLabel: cfg.label,
            targetRoute: cfg.route,
            status: 'Active',
            password: item.password,
            created_at: item.created_at || new Date().toISOString(),
            initials: (item.fullName || item.email).slice(0, 2).toUpperCase(),
          });
        }
      } catch {}
    });

    // 2. Load from DB staff/users if available
    try {
      const dbStaff = await getStaffMembers();
      dbStaff.forEach((s: any) => {
        if (!list.some(l => l.email.toLowerCase() === (s.email || '').toLowerCase())) {
          const cfg = DIVISION_CONFIG[s.role] || DIVISION_CONFIG.admin;
          list.push({
            id: s.id || `db_${s.email}`,
            name: s.full_name || s.email.split('@')[0],
            email: s.email,
            role: s.role || 'admin',
            division: s.role || 'admin',
            divisionLabel: cfg.label,
            targetRoute: cfg.route,
            status: 'Active',
            created_at: s.created_at || new Date().toISOString(),
            initials: (s.full_name || s.email || 'AD').slice(0, 2).toUpperCase(),
          });
        }
      });
    } catch {}

    // 3. Seed default division admins if empty
    if (list.length === 0) {
      const defaults = [
        { name: 'Education Director', email: 'education.admin@ferex.com', pass: 'Admin@123', role: 'admin' },
        { name: 'Global Trade Head', email: 'trade.admin@ferex.com', pass: 'Trade@123', role: 'trade' },
        { name: 'Rimi Distribution Lead', email: 'rimi.admin@ferex.com', pass: 'Rimi@123', role: 'rimi' },
        { name: 'Digital Agency PM', email: 'digital.admin@ferex.com', pass: 'Digital@123', role: 'digital' },
      ];
      defaults.forEach(d => {
        const cfg = DIVISION_CONFIG[d.role];
        const item = {
          id: `def_${d.email}`,
          name: d.name,
          email: d.email,
          role: d.role,
          division: d.role,
          divisionLabel: cfg.label,
          targetRoute: cfg.route,
          status: 'Active' as const,
          password: d.pass,
          created_at: new Date().toISOString(),
          initials: d.name.slice(0, 2).toUpperCase(),
        };
        list.push(item);
        localStorage.setItem(`ferex_admin_cred_${d.email.toLowerCase()}`, JSON.stringify({
          email: d.email,
          password: d.pass,
          fullName: d.name,
          role: d.role,
          created_at: item.created_at,
        }));
      });
    }

    setAdminList(list);
    setLoading(false);
  };

  useEffect(() => {
    loadAdmins();
    const handleCreated = () => loadAdmins();
    window.addEventListener('ferex_admin_created', handleCreated);
    return () => window.removeEventListener('ferex_admin_created', handleCreated);
  }, []);

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
    const result = await provisionDivisionAdmin(email.trim(), password, fullName.trim(), selectedRole);
    setIsSubmitting(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    showToastMsg(`✅ Provisioned ${fullName.trim()} as ${DIVISION_CONFIG[selectedRole].label}! Credentials active.`);
    setShowAddModal(false);
    setFullName('');
    setEmail('');
    setPassword('');
    setSelectedRole('admin');
    loadAdmins();
  };

  const handleDelete = (id: string, emailToDelete: string) => {
    setAdminList(prev => prev.filter(a => a.id !== id));
    localStorage.removeItem(`ferex_admin_cred_${emailToDelete.toLowerCase()}`);
    showToastMsg('Admin account removed.');
  };

  const copyCredentials = (adm: AdminAccount) => {
    const text = `Email: ${adm.email}\nPassword: ${adm.password || 'Configured via Supabase Auth'}\nRole: ${adm.divisionLabel}\nLogin Portal: ${window.location.origin}/#/login`;
    navigator.clipboard.writeText(text);
    showToastMsg('📋 Login credentials copied to clipboard!');
  };

  const filteredAdmins = adminList.filter(a => {
    const matchesFilter =
      divisionFilter === 'All' ||
      (divisionFilter === 'Education' && (a.role === 'admin' || a.role === 'education_admin')) ||
      (divisionFilter === 'Trade' && (a.role === 'trade' || a.role === 'trade_admin')) ||
      (divisionFilter === 'Rimi' && (a.role === 'rimi' || a.role === 'rimi_admin')) ||
      (divisionFilter === 'Digital' && (a.role === 'digital' || a.role === 'digital_admin')) ||
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
            <ShieldCheck className="w-6 h-6 text-[#6A1B2E]" /> Universal Division Admin Governance
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Super Admin Console • Create and manage email & password logins for all 4 Enterprise Division Portals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={loadAdmins}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="bg-[#6A1B2E] hover:bg-[#521221] text-white text-xs font-bold shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Provision Division Admin
          </Button>
        </div>
      </div>

      {/* Division KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Education Admins', count: adminList.filter(a => a.role === 'admin' || a.role === 'education_admin').length, icon: GraduationCap, color: 'text-rose-600 bg-rose-50' },
          { label: 'Global Trade Admins', count: adminList.filter(a => a.role === 'trade' || a.role === 'trade_admin').length, icon: Globe, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Rimi Frozen Admins', count: adminList.filter(a => a.role === 'rimi' || a.role === 'rimi_admin').length, icon: Snowflake, color: 'text-cyan-600 bg-cyan-50' },
          { label: 'Digital Agency Admins', count: adminList.filter(a => a.role === 'digital' || a.role === 'digital_admin').length, icon: Monitor, color: 'text-emerald-600 bg-emerald-50' },
        ].map((card, idx) => (
          <Card key={idx} className="p-4 border border-slate-200/80 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center shrink-0`}>
              <card.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10.5px] font-black uppercase tracking-wider text-slate-400">{card.label}</p>
              <p className="text-xl font-black text-slate-900 leading-tight">{card.count}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 border border-slate-200/80">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or division..."
              className="w-full h-9 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#6A1B2E] transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {['All', 'Education', 'Trade', 'Rimi', 'Digital', 'SuperAdmin'].map((filter) => (
              <button
                key={filter}
                onClick={() => setDivisionFilter(filter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${divisionFilter === filter
                    ? 'bg-[#6A1B2E] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                {filter === 'All' ? 'All Divisions' : filter}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Admin List Table */}
      <Card className="border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black text-[10px] uppercase tracking-wider">
                <th className="py-3 px-4">Administrator / Email</th>
                <th className="py-3 px-4">Controlled Division / App</th>
                <th className="py-3 px-4">Credentials Status</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">
                    No division administrators match your criteria.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((adm) => {
                  const cfg = DIVISION_CONFIG[adm.role] || DIVISION_CONFIG.admin;
                  const Icon = cfg.icon;

                  return (
                    <tr key={adm.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#6A1B2E] text-white flex items-center justify-center font-black text-xs shrink-0">
                            {adm.initials}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 text-xs">{adm.name}</p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {adm.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border ${cfg.badgeColor}`}>
                            <Icon className="w-3.5 h-3.5" /> {adm.divisionLabel}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {adm.password ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                              ••••••••
                            </span>
                            <button
                              onClick={() => copyCredentials(adm)}
                              title="Copy Login Credentials"
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                            <Key className="w-3 h-3" /> Supabase SSO Active
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => window.location.href = `/#${adm.targetRoute}`}
                            title="Launch Controlled App"
                            className="p-1.5 text-slate-500 hover:text-[#6A1B2E] hover:bg-[#6A1B2E]/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(adm.id, adm.email)}
                            title="Delete Admin"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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

      {/* PROVISION DIVISION ADMIN MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-left space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Provision Division Admin</h3>
                    <p className="text-xs font-semibold text-slate-400">Set email, password, and assign 1 of 4 apps</p>
                  </div>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <Input
                  label="Administrator Full Name"
                  placeholder="e.g., Sarah Jenkins"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />

                <Input
                  label="Login Email Address"
                  type="email"
                  placeholder="e.g., sarah.trade@ferex.com"
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

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Assign Division / Application Access:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { role: 'admin' as const, label: 'Ferex Education', desc: 'Education Admin', icon: GraduationCap, color: 'border-rose-300 text-rose-800 bg-rose-50/50' },
                      { role: 'trade' as const, label: 'Global Trade', desc: 'Trade CRM & Shipping', icon: Globe, color: 'border-indigo-300 text-indigo-800 bg-indigo-50/50' },
                      { role: 'rimi' as const, label: 'Rimi Frozen', desc: 'Distribution & Warehouse', icon: Snowflake, color: 'border-cyan-300 text-cyan-800 bg-cyan-50/50' },
                      { role: 'digital' as const, label: 'Ferex Digital', desc: 'Agency & Projects', icon: Monitor, color: 'border-emerald-300 text-emerald-800 bg-emerald-50/50' },
                      { role: 'superadmin' as const, label: 'Central Super Admin', desc: 'Full 4-App Access', icon: Crown, color: 'border-amber-300 text-amber-900 bg-amber-50/50' },
                    ].map((opt) => (
                      <button
                        key={opt.role}
                        type="button"
                        onClick={() => setSelectedRole(opt.role)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2 ${selectedRole === opt.role
                            ? `${opt.color} ring-2 ring-[#6A1B2E]/40 font-black shadow-xs`
                            : 'border-slate-200 bg-white hover:bg-slate-50 opacity-75'
                          } ${opt.role === 'superadmin' ? 'col-span-2' : ''}`}
                      >
                        <opt.icon className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-extrabold">{opt.label}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddModal(false)}
                    className="text-xs font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting}
                    className="bg-[#6A1B2E] hover:bg-[#521221] text-white text-xs font-bold shadow-md"
                  >
                    {isSubmitting ? 'Creating...' : 'Create & Activate Login'}
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
