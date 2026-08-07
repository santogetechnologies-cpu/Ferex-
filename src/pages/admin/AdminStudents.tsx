import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Eye, Edit3, Trash2, X, Save, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

interface Student {
  id: string; name: string; email: string; phone: string; country: string;
  university: string; course: string; intake: string; status: string; statusColor: string;
  counselor: string; joined: string; appStatus: string;
}

const STUDENTS: Student[] = [
  { id: 'FX-2026-001', name: 'Ashly', email: 'student@gmail.com', phone: '+91 98765 43210', country: 'India', university: 'University of Warsaw', course: 'M.Sc. Computer Science', intake: 'Feb 2026', status: 'Active', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-100', counselor: 'Education Team', joined: 'Nov 10, 2025', appStatus: 'Offer Received' },
  { id: 'FX-2026-002', name: 'Rahul Mehta', email: 'rahul@example.com', phone: '+91 99000 11223', country: 'India', university: 'TU Berlin', course: 'M.Sc. Data Engineering', intake: 'Oct 2026', status: 'Active', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-100', counselor: 'Riya Shah', joined: 'Dec 5, 2025', appStatus: 'Under Review' },
  { id: 'FX-2026-003', name: 'Priya Sharma', email: 'priya@example.com', phone: '+91 98123 45678', country: 'India', university: 'University of Amsterdam', course: 'M.A. Business Analytics', intake: 'Sep 2026', status: 'Pending', statusColor: 'bg-amber-50 text-amber-700 border-amber-100', counselor: 'Arjun Pillai', joined: 'Jan 3, 2026', appStatus: 'Docs Pending' },
];

export const AdminStudents: React.FC = () => {
  const [students, setStudents] = useState(STUDENTS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editTemp, setEditTemp] = useState<Student | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 6;

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const filtered = students.filter(s =>
    (statusFilter === 'All' || s.status === statusFilter) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()))
  );
  const pages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const handleSaveEdit = () => {
    if (!editTemp) return;
    setStudents(prev => prev.map(s => s.id === editTemp.id ? editTemp : s));
    setEditStudent(null);
    setEditTemp(null);
    showToast('Student record updated.');
  };

  const handleDelete = () => {
    setStudents(prev => prev.filter(s => s.id !== deleteId));
    setDeleteId(null);
    showToast('Student removed from records.');
  };

  return (
    <div className="space-y-5 relative">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Students</h1>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">{students.length} total students enrolled</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 h-9 px-4 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#4A101E] transition-all shadow-sm">
          <Plus className="w-3.5 h-3.5" /> Add Student
        </button>
      </div>

      {/* Search + Filter Header */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search by name, ID or email..."
            className="w-full h-10 pl-9.5 pr-4 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#6A1B2E]/40 focus:ring-4 focus:ring-[#6A1B2E]/5 transition-all shadow-xs"
          />
        </div>
        <div className="flex gap-1.5">
          {['All', 'Active', 'Pending', 'Inactive'].map(f => (
            <button key={f} onClick={() => { setStatusFilter(f); setCurrentPage(1); }}
              className={`h-10 px-4 rounded-xl text-xs font-bold border transition-all duration-150 active:scale-98 ${statusFilter === f ? 'bg-[#6A1B2E] text-white border-[#6A1B2E] shadow-sm shadow-[#6A1B2E]/20' : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200/70 rounded-2xl shadow-xs overflow-hidden">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 uppercase text-[9.5px] font-extrabold tracking-wider">
              {['Student', 'ID', 'University / Course', 'Status', 'Counselor', 'Actions'].map(h => (
                <th key={h} className="text-left px-5 py-3.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paged.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8.5 h-8.5 rounded-xl bg-[#6A1B2E] flex items-center justify-center text-white text-xs font-black shrink-0 shadow-xs">
                      {s.name[0]}
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900">{s.name}</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{s.country}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 font-extrabold text-slate-600">{s.id}</td>
                <td className="px-5 py-4">
                  <p className="font-extrabold text-slate-800 truncate max-w-[170px]">{s.university}</p>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5 truncate max-w-[170px]">{s.course}</p>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${s.statusColor}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {s.status}
                  </span>
                </td>
                <td className="px-5 py-4 font-semibold text-slate-600">{s.counselor}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setViewStudent(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View Profile"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => { setEditStudent(s); setEditTemp({ ...s }); }} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Edit Student"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Remove Student"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-extrabold text-slate-700">No students found</p>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Try adjusting your search or status filters.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400">Showing {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, filtered.length)} of {filtered.length}</p>
          <div className="flex gap-1">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setCurrentPage(p)}
                className={`w-9 h-9 rounded-xl text-xs font-bold border transition-all ${currentPage === p ? 'bg-[#6A1B2E] text-white border-[#6A1B2E]' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {p}
              </button>
            ))}
            <button disabled={currentPage === pages} onClick={() => setCurrentPage(p => p + 1)}
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* View Drawer */}
      <AnimatePresence>
        {viewStudent && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50" onClick={() => setViewStudent(null)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-[420px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-100">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-extrabold text-slate-900">Student Profile</h3>
                <button onClick={() => setViewStudent(null)} className="p-2 rounded-full hover:bg-slate-50 text-slate-400"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#6A1B2E] flex items-center justify-center text-white text-2xl font-extrabold">
                    {viewStudent.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base">{viewStudent.name}</h4>
                    <p className="text-xs font-semibold text-slate-500">{viewStudent.id}</p>
                    <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${viewStudent.statusColor}`}>{viewStudent.status}</span>
                  </div>
                </div>
                {[
                  { label: 'Email', value: viewStudent.email },
                  { label: 'Phone', value: viewStudent.phone },
                  { label: 'Country', value: viewStudent.country },
                  { label: 'University', value: viewStudent.university },
                  { label: 'Course', value: viewStudent.course },
                  { label: 'Intake', value: viewStudent.intake },
                  { label: 'Application Status', value: viewStudent.appStatus },
                  { label: 'Counselor', value: viewStudent.counselor },
                  { label: 'Joined', value: viewStudent.joined },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-3 py-2 border-b border-slate-50">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{label}</span>
                    <span className="text-xs font-bold text-slate-800 text-right">{value}</span>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-slate-100">
                <button onClick={() => { setEditStudent(viewStudent); setEditTemp({ ...viewStudent }); setViewStudent(null); }}
                  className="w-full h-10 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#4A101E] transition-all">
                  Edit Student
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editStudent && editTemp && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={() => setEditStudent(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-extrabold text-slate-900">Edit Student — {editTemp.id}</h3>
                <button onClick={() => setEditStudent(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Full Name', key: 'name' as const },
                  { label: 'Email', key: 'email' as const },
                  { label: 'Phone', key: 'phone' as const },
                  { label: 'University', key: 'university' as const },
                  { label: 'Course', key: 'course' as const },
                  { label: 'Counselor', key: 'counselor' as const },
                ].map(({ label, key }) => (
                  <div key={key} className={key === 'university' || key === 'course' ? 'col-span-2' : ''}>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">{label}</label>
                    <input
                      value={editTemp[key]}
                      onChange={(e) => setEditTemp({ ...editTemp, [key]: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40 transition-all"
                    />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                  <select value={editTemp.status} onChange={(e) => setEditTemp({ ...editTemp, status: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40">
                    <option>Active</option><option>Pending</option><option>Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setEditStudent(null)} className="flex-1 h-9 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50">Cancel</button>
                <button onClick={handleSaveEdit} className="flex-1 h-9 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#4A101E] flex items-center justify-center gap-1.5">
                  <Save className="w-3.5 h-3.5" /> Save Changes
                </button>
              </div>
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
                <h3 className="text-sm font-extrabold text-slate-900">Remove Student?</h3>
              </div>
              <p className="text-xs font-semibold text-slate-500 mb-5">This will permanently remove student {deleteId} from all records.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 h-9 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50">Cancel</button>
                <button onClick={handleDelete} className="flex-1 h-9 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700">Delete</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-extrabold text-slate-900">Add New Student</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const name = (form.elements.namedItem('name') as HTMLInputElement).value;
                const email = (form.elements.namedItem('email') as HTMLInputElement).value;
                const newId = `FX-2026-${String(students.length + 1).padStart(3, '0')}`;
                setStudents(prev => [{
                  id: newId, name, email, phone: '+00 0000 00000', country: 'India', flag: '🇮🇳',
                  university: 'TBD', course: 'TBD', intake: 'TBD', status: 'Pending',
                  statusColor: 'bg-amber-50 text-amber-700 border-amber-100',
                  counselor: 'Education Team', joined: 'Today', appStatus: 'Submitted',
                }, ...prev]);
                setShowAddModal(false);
                showToast(`Student ${name} added successfully!`);
              }} className="space-y-4">
                {[{ label: 'Full Name', name: 'name', type: 'text' }, { label: 'Email Address', name: 'email', type: 'email' }].map(f => (
                  <div key={f.name}>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">{f.label}</label>
                    <input required type={f.type} name={f.name}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40" />
                  </div>
                ))}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 h-9 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50">Cancel</button>
                  <button type="submit" className="flex-1 h-9 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#4A101E]">Add Student</button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
