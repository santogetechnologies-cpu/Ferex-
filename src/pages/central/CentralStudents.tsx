import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Eye, Edit3, Trash2, X, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getStudents, createStudent } from '../../lib/api/students';

export const CentralStudents: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const data = await getStudents();
    const formatted = data.map((d: any) => ({
      id: d.id ? `FX-${d.id.slice(0, 4).toUpperCase()}` : 'FX-STUDENT',
      name: d.full_name || 'Student',
      email: d.email,
      country: 'India',
      targetUni: 'University of Warsaw',
      course: 'M.Sc. in Computer Science',
      stage: 'Enrolled & Verified',
      stageBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      counselor: d.assigned_counselor || 'Education Team',
      joined: d.created_at ? new Date(d.created_at).toLocaleDateString() : 'Active',
    }));
    setStudents(formatted);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    targetUni: 'University of Warsaw',
    course: 'M.Sc. Computer Science',
    counselor: 'Rahul Mehta'
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.email) return;
    await createStudent({
      full_name: newStudent.name,
      email: newStudent.email,
      assigned_counselor: newStudent.counselor,
    });
    setShowAddModal(false);
    showToastMsg(`Enrolled student ${newStudent.name}`);
    setNewStudent({ name: '', email: '', targetUni: 'University of Warsaw', course: 'M.Sc. Computer Science', counselor: 'Rahul Mehta' });
    await loadData();
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setStudents(students.map(s => s.id === editingStudent.id ? editingStudent : s));
    setEditingStudent(null);
    showToastMsg('Student profile updated!');
  };

  const handleDeleteStudent = (id: string) => {
    setStudents(students.filter(s => s.id !== id));
    showToastMsg(`Removed student record ${id}`);
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.targetUni.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#6A1B2E]" /> Master Student Directory
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Super Admin Console • Global student records, counselor assignments, and application stages.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="h-9 px-4 rounded-xl text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221] text-white shadow-xs transition-colors flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
        >
          Add New Student
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading students directory...</div>
      ) : null}

      {/* Search Bar */}
      <Card className="p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student name, ID, or university..."
            className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
          />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredStudents.length} Students Listed</span>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                <th className="py-3 px-4">Student ID & Name</th>
                <th className="py-3 px-4">Target Institution & Course</th>
                <th className="py-3 px-4">Admissions Stage</th>
                <th className="py-3 px-4">Assigned Counselor</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#6A1B2E] text-white font-black text-xs flex items-center justify-center shadow-xs">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900">
                          {student.name}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">{student.id} · {student.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-800">{student.targetUni}</div>
                    <div className="text-[10px] font-semibold text-slate-400">{student.course}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${student.stageBadge}`}>
                      {student.stage}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {student.counselor}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        title="View Full Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingStudent(student)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit Student Profile"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(student.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Remove Student"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Student Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Enroll New Student</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddStudent} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Student Full Name</label>
                  <input type="text" required value={newStudent.name} onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })} placeholder="e.g. Vikram Sharma" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Email Address</label>
                  <input type="email" required value={newStudent.email} onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })} placeholder="e.g. vikram@gmail.com" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Target Institution</label>
                  <select value={newStudent.targetUni} onChange={(e) => setNewStudent({ ...newStudent, targetUni: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                    <option value="University of Warsaw">University of Warsaw (Poland)</option>
                    <option value="TU Berlin">TU Berlin (Germany)</option>
                    <option value="University of Amsterdam">University of Amsterdam (Netherlands)</option>
                  </select>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save & Enroll</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Student Modal */}
      <AnimatePresence>
        {editingStudent && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setEditingStudent(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Edit Student Record: {editingStudent.id}</h3>
                <button onClick={() => setEditingStudent(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSaveEdit} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Student Name</label>
                  <input type="text" value={editingStudent.name} onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Assigned Counselor</label>
                  <input type="text" value={editingStudent.counselor} onChange={(e) => setEditingStudent({ ...editingStudent, counselor: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setEditingStudent(null)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save Changes</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Student Drawer */}
      <AnimatePresence>
        {selectedStudent && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedStudent(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Student Profile Inspector</h3>
                <button onClick={() => setSelectedStudent(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-5 text-left">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-12 h-12 rounded-xl bg-[#6A1B2E] text-white font-black text-base flex items-center justify-center">
                    {selectedStudent.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900">{selectedStudent.name}</h4>
                    <p className="text-xs font-semibold text-slate-500">{selectedStudent.id} · {selectedStudent.email}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Target Institution</span>
                    <span className="text-xs font-black text-slate-900">{selectedStudent.targetUni}</span>
                    <span className="text-xs font-semibold text-slate-500 block mt-0.5">{selectedStudent.course}</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Admissions Stage</span>
                    <span className="text-xs font-black text-slate-900">{selectedStudent.stage}</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Assigned Counselor</span>
                    <span className="text-xs font-black text-slate-900">{selectedStudent.counselor}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
