import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit3, Trash2, X, Save, CheckCircle2, Mail, Phone } from 'lucide-react';

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

const STAFF: StaffMember[] = [
  { id: 'ST-001', name: 'Riya Shah', email: 'riya@ferex.com', phone: '+91 99000 12345', department: 'Admissions', role: 'Senior Counselor', status: 'Active', joined: 'Jan 2024', students: 48, permissions: [...DEFAULT_PERMS.map(p => ({ ...p, enabled: ['View Students', 'Edit Applications', 'View Reports'].includes(p.label) }))] },
  { id: 'ST-002', name: 'Arjun Pillai', email: 'arjun@ferex.com', phone: '+91 99000 67890', department: 'Operations', role: 'Application Manager', status: 'Active', joined: 'Mar 2024', students: 62, permissions: [...DEFAULT_PERMS.map(p => ({ ...p, enabled: ['View Students', 'Edit Applications', 'Approve Documents', 'View Reports'].includes(p.label) }))] },
  { id: 'ST-003', name: 'Meena Iyer', email: 'meena@ferex.com', phone: '+91 99000 22334', department: 'Documents', role: 'Document Verifier', status: 'Active', joined: 'Jun 2024', students: 35, permissions: [...DEFAULT_PERMS.map(p => ({ ...p, enabled: ['View Students', 'Approve Documents'].includes(p.label) }))] },
  { id: 'ST-004', name: 'Kabir Nair', email: 'kabir@ferex.com', phone: '+91 99000 44556', department: 'Finance', role: 'Payments Coordinator', status: 'On Leave', joined: 'Sep 2024', students: 29, permissions: [...DEFAULT_PERMS.map(p => ({ ...p, enabled: ['View Students', 'Manage Payments', 'View Reports'].includes(p.label) }))] },
  { id: 'ST-005', name: 'Lena Fischer', email: 'lena@ferex.com', phone: '+49 176 12345678', department: 'Admissions', role: 'EU Counselor', status: 'Active', joined: 'Oct 2024', students: 22, permissions: [...DEFAULT_PERMS.map(p => ({ ...p, enabled: ['View Students', 'Edit Applications', 'View Reports'].includes(p.label) }))] },
];

const STATUS_COLORS = {
  'Active': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'On Leave': 'bg-amber-50 text-amber-700 border-amber-100',
  'Inactive': 'bg-slate-50 text-slate-600 border-slate-200',
};

export const AdminStaffManagement: React.FC = () => {
  const [staff, setStaff] = useState(STAFF);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [editTemp, setEditTemp] = useState<StaffMember | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const depts = ['All', ...Array.from(new Set(staff.map(s => s.department)))];

  const filtered = staff.filter(s =>
    (deptFilter === 'All' || s.department === deptFilter) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()) || s.role.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSaveEdit = () => {
    if (!editTemp) return;
    setStaff(prev => prev.map(s => s.id === editTemp.id ? editTemp : s));
    setEditStaff(null);
    showToast('Staff record updated.');
  };

  const handleDelete = () => {
    setStaff(prev => prev.filter(s => s.id !== deleteId));
    setDeleteId(null);
    showToast('Staff member removed.');
  };

  const togglePerm = (staffId: string, permLabel: string) => {
    setStaff(prev => prev.map(s => s.id === staffId
      ? { ...s, permissions: s.permissions.map(p => p.label === permLabel ? { ...p, enabled: !p.enabled } : p) }
      : s
    ));
    showToast('Permission updated.');
  };

  return (
    <div className="space-y-5 relative">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" /> {toast}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Staff Management</h1>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">{staff.length} team members</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 h-9 px-4 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#4A101E] transition-all shadow-sm">
          <Plus className="w-3.5 h-3.5" /> Add Staff
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {depts.map(d => (
          <button key={d} onClick={() => setDeptFilter(d)}
            className={`h-8 px-3 rounded-xl text-[10px] font-extrabold border transition-all
              ${deptFilter === d ? 'bg-[#6A1B2E] text-white border-[#6A1B2E]' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
            {d}
          </button>
        ))}
        <div className="ml-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff..."
            className="h-9 pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold placeholder-slate-300 focus:outline-none focus:border-[#6A1B2E]/40 w-48" />
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
              <span className="text-[10px] font-semibold text-slate-400">{s.students} students · Since {s.joined}</span>
              <div className="flex gap-1.5">
                <button onClick={() => { setEditStaff(s); setEditTemp({ ...s, permissions: s.permissions.map(p => ({ ...p })) }); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"><Edit3 className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteId(s.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
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
                <h3 className="text-sm font-extrabold text-slate-900">Edit Staff — {editTemp.id}</h3>
                <button onClick={() => setEditStaff(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Full Name', key: 'name' as const },
                    { label: 'Role', key: 'role' as const },
                    { label: 'Email', key: 'email' as const },
                    { label: 'Phone', key: 'phone' as const },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">{label}</label>
                      <input value={editTemp[key]} onChange={(e) => setEditTemp({ ...editTemp, [key]: e.target.value })}
                        className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Department</label>
                    <select value={editTemp.department} onChange={(e) => setEditTemp({ ...editTemp, department: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40">
                      {['Admissions', 'Operations', 'Documents', 'Finance'].map(d => <option key={d}>{d}</option>)}
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
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setEditStaff(null)} className="flex-1 h-9 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50">Cancel</button>
                <button onClick={handleSaveEdit} className="flex-1 h-9 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#4A101E] flex items-center justify-center gap-1.5">
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
                <h3 className="text-sm font-extrabold text-slate-900">Add New Staff Member</h3>
                <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const f = e.target as HTMLFormElement;
                const name = (f.elements.namedItem('name') as HTMLInputElement).value;
                const email = (f.elements.namedItem('email') as HTMLInputElement).value;
                const role = (f.elements.namedItem('role') as HTMLInputElement).value;
                setStaff(prev => [{
                  id: `ST-${String(staff.length + 1).padStart(3, '0')}`, name, email, role,
                  phone: '—', department: 'Admissions', status: 'Active', joined: 'Today',
                  students: 0, permissions: DEFAULT_PERMS.map(p => ({ ...p })),
                }, ...prev]);
                setShowAdd(false);
                showToast(`${name} added to staff.`);
              }} className="space-y-3">
                {[{ l: 'Full Name', n: 'name' }, { l: 'Email', n: 'email' }, { l: 'Role', n: 'role' }].map(({ l, n }) => (
                  <div key={n}>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">{l}</label>
                    <input required name={n}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40" />
                  </div>
                ))}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAdd(false)} className="flex-1 h-9 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50">Cancel</button>
                  <button type="submit" className="flex-1 h-9 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#4A101E]">Add Staff</button>
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
                <h3 className="text-sm font-extrabold text-slate-900">Remove Staff Member?</h3>
              </div>
              <p className="text-xs font-semibold text-slate-500 mb-5">This staff member will be permanently removed from the team.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 h-9 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50">Cancel</button>
                <button onClick={handleDelete} className="flex-1 h-9 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700">Remove</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
