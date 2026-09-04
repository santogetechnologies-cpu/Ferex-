import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit3, Trash2, X, Save, CheckCircle2, Mail, Phone } from 'lucide-react';
import { getStaffMembers, createStaffMember, updateStudent, deleteStudent } from '../../lib/api/students';
import { useAuth } from '../../contexts/AuthContext';

interface StaffMember {
  id: string; name: string; email: string; phone: string; department: string;
  role: string; status: 'Active' | 'On Leave' | 'Inactive'; joined: string; students: number;
  permissions: { label: string; enabled: boolean }[];
}

const DEFAULT_PERMS = [
  { label: 'View Students', enabled: true },
  { label: 'Edit Applications', enabled: true },
  { label: 'Approve Documents', enabled: false },
  { label: 'Manage Payments', enabled: false },
  { label: 'View Reports', enabled: true },
  { label: 'Manage Staff', enabled: false },
];

const STATUS_COLORS = {
  'Active': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'On Leave': 'bg-amber-50 text-amber-700 border-amber-100',
  'Inactive': 'bg-slate-50 text-slate-600 border-slate-200',
};

const ROLE_DISPLAY_MAP: Record<string, string> = {
  'admin': 'Admin',
  'central': 'Central',
  'super_admin': 'Super Admin',
  'staff': 'Staff',
  'counselor': 'Counselor',
};

const ALLOWED_ROLES = ['Admin', 'Central', 'Super Admin', 'Staff', 'Counselor'] as const;

const getDbRole = (displayRole: string): string => {
  const lower = displayRole.toLowerCase().trim();
  if (lower === 'super admin' || lower === 'super_admin') return 'super_admin';
  if (lower === 'central') return 'central';
  if (lower === 'admin') return 'admin';
  if (lower === 'counselor') return 'counselor';
  return 'staff';
};

export const AdminStaffManagement: React.FC = () => {
  const { user, profile } = useAuth();
  const userRole = (profile?.role || user?.role || user?.user_metadata?.role || '').toLowerCase().trim();
  const isSuper = userRole === 'superadmin' || userRole === 'super_admin' || userRole === 'central';

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roleFilter, setRoleFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [editTemp, setEditTemp] = useState<StaffMember | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState('');

  const loadData = () => {
    getStaffMembers().then(members => {
      const mapped = members.map(m => {
        const parts = (m.department || '').split(':');
        const dept = parts[0] || 'Admissions';
        const customRole = parts[1] || ROLE_DISPLAY_MAP[m.role] || (m.role === 'admin' ? 'Admin' : 'Staff');
        return {
          id: m.id,
          name: m.full_name || m.email.split('@')[0],
          email: m.email,
          phone: m.phone || '—',
          department: dept,
          role: customRole,
          status: 'Active' as const,
          joined: new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          students: 0,
          permissions: m.permissions || DEFAULT_PERMS,
        };
      });
      setStaff(mapped);
    }).catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const roles = ['All', 'Admin', 'Central', 'Super Admin', 'Staff', 'Counselor'];

  const filtered = staff.filter(s =>
    (roleFilter === 'All' || s.role.toLowerCase() === roleFilter.toLowerCase()) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()) || s.role.toLowerCase().includes(search.toLowerCase()) || s.department.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSaveEdit = async () => {
    if (!editTemp) return;
    try {
      const dbRole = getDbRole(editTemp.role);
      await updateStudent(editTemp.id, {
        full_name: editTemp.name,
        role: dbRole,
        phone: editTemp.phone,
        department: `${editTemp.department}:${editTemp.role}`,
        permissions: editTemp.permissions
      });
      setStaff(prev => prev.map(s => s.id === editTemp.id ? editTemp : s));
      setEditStaff(null);
      showToast('Administrative user record updated successfully.');
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteStudent(deleteId);
      setStaff(prev => prev.filter(s => s.id !== deleteId));
      setDeleteId(null);
      showToast('Administrative user removed from system.');
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
    }
  };

  const togglePerm = async (staffId: string, permLabel: string) => {
    let updatedStaffMember: StaffMember | undefined;
    setStaff(prev => prev.map(s => {
      if (s.id === staffId) {
        const updated = {
          ...s,
          permissions: s.permissions.map(p => p.label === permLabel ? { ...p, enabled: !p.enabled } : p)
        };
        updatedStaffMember = updated;
        return updated;
      }
      return s;
    }));

    if (updatedStaffMember) {
      try {
        await updateStudent(staffId, {
          permissions: updatedStaffMember.permissions
        });
        showToast('Permission updated in database.');
      } catch (e: any) {
        showToast(`Error: ${e.message}`);
      }
    }
  };

  return (
    <div className="space-y-5 relative text-left">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" /> {toast}
        </div>
      )}

      {/* Central Super Admin User Governance Banner (VISIBLE ONLY TO CENTRAL SUPER ADMINS) */}
      {isSuper && (
        <div className="p-4 bg-gradient-to-r from-[#6A1B2E]/10 via-[#6A1B2E]/5 to-transparent border border-[#6A1B2E]/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-[#6A1B2E] flex items-center gap-1.5">
              👑 Universal User & Admin Management
            </p>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
              Creating and provisioning logins for all 4 enterprise divisions (Education, Trade, Rimi Frozen, Digital) is managed centrally in Super Admin.
            </p>
          </div>
          <a
            href="/#/central/admins"
            className="px-3 py-1.5 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#521221] transition-all shrink-0 shadow-xs"
          >
            Open Super Admin Console →
          </a>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Admin User Management</h1>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">{staff.length} Administrative & Operational Users</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 h-9 px-4 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#4A101E] transition-all shadow-sm cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Add Admin User
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {roles.map(r => (
          <button key={r} onClick={() => setRoleFilter(r)}
            className={`h-8 px-3 rounded-xl text-[10px] font-extrabold border transition-all cursor-pointer
              ${roleFilter === r ? 'bg-[#6A1B2E] text-white border-[#6A1B2E]' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
            {r}
          </button>
        ))}
        <div className="ml-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search admin users..."
            className="h-9 pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold placeholder-slate-300 focus:outline-none focus:border-[#6A1B2E]/40 w-52" />
        </div>
      </div>

      {/* Staff cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <motion.div key={s.id} layout className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-200 transition-all">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#6A1B2E] flex items-center justify-center text-white font-extrabold text-lg shrink-0">
                {s.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <p className="text-sm font-extrabold text-slate-900 truncate">{s.name}</p>
                  <span className={`shrink-0 inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${STATUS_COLORS[s.status]}`}>{s.status}</span>
                </div>
                <p className="text-[10px] font-bold text-[#6A1B2E]">{s.role}</p>
                <p className="text-[10px] font-semibold text-slate-400">{s.department}</p>
              </div>
            </div>

            <div className="space-y-1.5 mb-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
                <Mail className="w-3 h-3 text-slate-400" /> {s.email}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
                <Phone className="w-3 h-3 text-slate-400" /> {s.phone}
              </div>
            </div>

            {/* Permissions */}
            <div className="border-t border-slate-50 pt-3 mb-4">
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Permissions</p>
              <div className="flex flex-wrap gap-1">
                {s.permissions.map(p => (
                  <button key={p.label} onClick={() => togglePerm(s.id, p.label)}
                    className={`h-5 px-1.5 rounded text-[8px] font-bold border transition-all cursor-pointer ${p.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200 line-through'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-50 pt-3">
              <span className="text-[10px] font-semibold text-slate-400">Since {s.joined}</span>
              <div className="flex gap-1.5">
                <button onClick={() => { setEditStaff(s); setEditTemp({ ...s, permissions: s.permissions.map(p => ({ ...p })) }); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteId(s.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editStaff && editTemp && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={() => setEditStaff(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-extrabold text-slate-900">Edit Administrative User</h3>
                <button onClick={() => setEditStaff(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3 text-left">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                    <input value={editTemp.name} onChange={(e) => setEditTemp({ ...editTemp, name: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Administrative Role</label>
                    <select value={editTemp.role} onChange={(e) => {
                      const newRole = e.target.value;
                      let newDept = editTemp.department;
                      if (newRole === 'Counselor') newDept = 'Admissions';
                      else if (newRole === 'Central') newDept = 'Central Office';
                      else if (newRole === 'Super Admin') newDept = 'Executive';
                      else if (newRole === 'Admin') newDept = 'Administration';
                      setEditTemp({ ...editTemp, role: newRole, department: newDept });
                    }}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40">
                      {ALLOWED_ROLES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Email</label>
                    <input value={editTemp.email} onChange={(e) => setEditTemp({ ...editTemp, email: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Phone</label>
                    <input value={editTemp.phone} onChange={(e) => setEditTemp({ ...editTemp, phone: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Department</label>
                    <select value={editTemp.department} onChange={(e) => setEditTemp({ ...editTemp, department: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40">
                      {['Administration', 'Central Office', 'Executive', 'Admissions', 'Operations', 'Documents', 'Finance'].map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                    <select value={editTemp.status} onChange={(e) => setEditTemp({ ...editTemp, status: e.target.value as any })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40">
                      <option>Active</option><option>On Leave</option><option>Inactive</option>
                    </select>
                  </div>
                </div>
                {/* Permissions Checklist in Edit Modal */}
                <div className="pt-3.5 border-t border-slate-100">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                    Administrative Capabilities / Permissions
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {editTemp.permissions.map((p) => (
                      <label
                        key={p.label}
                        className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200/60 rounded-xl cursor-pointer text-xs hover:bg-slate-100/50"
                      >
                        <input
                          type="checkbox"
                          checked={p.enabled}
                          onChange={(e) => {
                            const updatedPerms = editTemp.permissions.map(pm =>
                              pm.label === p.label ? { ...pm, enabled: e.target.checked } : pm
                            );
                            setEditTemp({ ...editTemp, permissions: updatedPerms });
                          }}
                          className="w-3.5 h-3.5 rounded text-[#6A1B2E] border-slate-300 focus:ring-[#6A1B2E]"
                        />
                        <span className={`font-semibold ${p.enabled ? 'text-slate-900 font-extrabold' : 'text-slate-400'}`}>
                          {p.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setEditStaff(null)} className="flex-1 h-9 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button onClick={handleSaveEdit} className="flex-1 h-9 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#4A101E] flex items-center justify-center gap-1.5 cursor-pointer">
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Staff Modal */}
      <AnimatePresence>
        {showAdd && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={() => setShowAdd(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-extrabold text-slate-900">Add Administrative User</h3>
                <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const f = e.target as HTMLFormElement;
                const name = (f.elements.namedItem('name') as HTMLInputElement).value;
                const email = (f.elements.namedItem('email') as HTMLInputElement).value;
                const category = (f.elements.namedItem('category') as HTMLSelectElement).value;
                const department = (f.elements.namedItem('department') as HTMLSelectElement).value;

                try {
                  const dbRole = getDbRole(category);
                  const created = await createStaffMember({
                    email,
                    full_name: name,
                    role: dbRole,
                    department: `${department}:${category}`,
                  });

                  setStaff(prev => [{
                    id: created.id,
                    name: created.full_name || name,
                    email: created.email,
                    phone: created.phone || '—',
                    department,
                    role: category,
                    status: 'Active',
                    joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                    students: 0,
                    permissions: DEFAULT_PERMS.map(p => ({ ...p })),
                  }, ...prev]);

                  setShowAdd(false);
                  showToast(`🎉 Administrative user ${name} added successfully!`);
                } catch (err: any) {
                  showToast(`Error: ${err.message || 'Failed to add'}`);
                }
              }} className="space-y-3.5 text-left">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                  <input required name="name" placeholder="e.g. Elena Rostova"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                  <input required name="email" type="email" placeholder="e.g. elena@ferex.com"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Administrative Role</label>
                  <select name="category" defaultValue="Admin"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40">
                    {ALLOWED_ROLES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Department</label>
                  <select name="department" defaultValue="Administration"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40">
                    {['Administration', 'Central Office', 'Executive', 'Admissions', 'Operations', 'Documents', 'Finance'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAdd(false)} className="flex-1 h-9 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer">Cancel</button>
                  <button type="submit" className="flex-1 h-9 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#4A101E] cursor-pointer">Add User</button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteId && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={() => setDeleteId(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><Trash2 className="w-5 h-5 text-red-500" /></div>
                <h3 className="text-sm font-extrabold text-slate-900">Remove Admin User?</h3>
              </div>
              <p className="text-xs font-semibold text-slate-500 mb-5">This administrative user will be removed from the system.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 h-9 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button onClick={handleDelete} className="flex-1 h-9 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 cursor-pointer">Remove</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
