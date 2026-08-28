import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Plus, Eye, X, CheckCircle2, Mail, Phone, Award } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getDigitalEmployees, createDigitalEmployee } from '../../lib/api/digital';

const deptColor: Record<string, string> = {
  'Web Development': 'bg-blue-50 text-blue-700 border-blue-200',
  'Design Studio': 'bg-purple-50 text-purple-700 border-purple-200',
  'Mobile Development': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Digital Marketing': 'bg-green-50 text-green-700 border-green-200',
  'Engineering': 'bg-blue-50 text-blue-700 border-blue-200',
  'Design': 'bg-purple-50 text-purple-700 border-purple-200',
};

export const DigitalEmployees: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [newEmp, setNewEmp] = useState({ name: '', role: '', department: 'Web Development', email: '', phone: '', salary: '' });

  const loadData = async () => {
    setLoading(true);
    const data = await getDigitalEmployees();
    const formatted = data.map((d: any) => ({
      id: d.emp_code || d.id,
      name: d.full_name,
      role: d.role_title,
      department: d.department,
      email: d.email,
      phone: d.phone,
      joined: d.joined_date || d.created_at?.split('T')[0],
      status: d.status || 'Active',
      salary: d.salary ? `₹${d.salary.toLocaleString()}/mo` : '₹75,000/mo',
      projects: d.active_tasks_count || 0
    }));
    setEmployees(formatted);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await createDigitalEmployee({
      full_name: newEmp.name,
      role_title: newEmp.role,
      department: newEmp.department,
      email: newEmp.email,
      phone: newEmp.phone,
      salary: parseFloat(newEmp.salary.replace(/[^0-9.]/g, '')) || 75000,
    });
    setShowAddModal(false);
    showToast(`${newEmp.name} added to team!`);
    setNewEmp({ name: '', role: '', department: 'Web Development', email: '', phone: '', salary: '' });
    await loadData();
  };

  const depts = ['All', 'Web Development', 'Design Studio', 'Mobile Development', 'Digital Marketing'];

  const filtered = employees.filter(e => {
    const matchS = e.name.toLowerCase().includes(search.toLowerCase()) || e.role.toLowerCase().includes(search.toLowerCase());
    const matchF = filterDept === 'All' || e.department === filterDept;
    return matchS && matchF;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2"><Users className="w-5 h-5 text-[#6A1B2E]" /> Team Members & Talent Pool</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Manage in-house developers, UI/UX designers, marketing leads, and performance scores.</p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Member
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading team members...</div>
      ) : null}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[['Total Staff', employees.length, 'text-slate-900'], ['Active', employees.filter(e => e.status === 'Active').length, 'text-emerald-700'], ['On Leave', employees.filter(e => e.status === 'On Leave').length, 'text-amber-700'], ['Departments', 4, 'text-blue-700']].map(([l, c, clr], idx) => (
          <Card key={idx} className="p-4 border border-slate-200/70 shadow-xs text-center">
            <div className={`text-2xl font-black ${clr}`}>{c}</div>
            <div className="text-[10px] font-extrabold uppercase text-slate-400 mt-0.5">{l}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or role..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {depts.map(d => (
            <button key={d} onClick={() => setFilterDept(d)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterDept === d ? 'bg-[#6A1B2E] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{d}</button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(emp => (
          <Card key={emp.id} className="p-5 border border-slate-200/70 shadow-xs hover:shadow-md transition-all space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#6A1B2E] to-[#9B3A50] text-white flex items-center justify-center text-sm font-black shrink-0">
                {emp.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black text-slate-900 truncate">{emp.name}</div>
                <div className="text-xs font-semibold text-slate-500 truncate">{emp.role}</div>
              </div>
              <span className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${emp.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{emp.status}</span>
            </div>
            <div>
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${deptColor[emp.department] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{emp.department}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 border-t border-slate-100 pt-3">
              <span className="font-black text-slate-900">{emp.salary}</span>
              <span>{emp.projects} Projects</span>
            </div>
            <button onClick={() => setSelectedEmp(emp)} className="w-full py-1.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:border-[#6A1B2E] hover:text-[#6A1B2E] transition-all flex items-center justify-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> View Profile
            </button>
          </Card>
        ))}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Add New Team Member</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3">
                <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Full Name</label>
                  <input type="text" required value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Role / Designation</label>
                    <input type="text" required value={newEmp.role} onChange={e => setNewEmp({...newEmp, role: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Department</label>
                    <select value={newEmp.department} onChange={e => setNewEmp({...newEmp, department: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      {['Web Development', 'Design Studio', 'Mobile Development', 'Digital Marketing'].map(d => <option key={d}>{d}</option>)}
                    </select></div>
                </div>
                <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Email</label>
                  <input type="email" required value={newEmp.email} onChange={e => setNewEmp({...newEmp, email: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Monthly Salary (₹)</label>
                  <input type="text" required value={newEmp.salary} onChange={e => setNewEmp({...newEmp, salary: e.target.value})} placeholder="₹0/mo" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Add Member</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Profile Drawer */}
      <AnimatePresence>
        {selectedEmp && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedEmp(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Employee Profile</h3>
                <button onClick={() => setSelectedEmp(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6A1B2E] to-[#9B3A50] text-white flex items-center justify-center text-2xl font-black">
                    {selectedEmp.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900">{selectedEmp.name}</h4>
                    <p className="text-xs font-semibold text-slate-500">{selectedEmp.role}</p>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border inline-block mt-1 ${deptColor[selectedEmp.department] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{selectedEmp.department}</span>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs font-semibold text-slate-600">
                  <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-[#6A1B2E]" />{selectedEmp.email}</p>
                  <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-[#6A1B2E]" />{selectedEmp.phone}</p>
                  <p className="flex items-center gap-2"><Award className="w-3.5 h-3.5 text-[#6A1B2E]" />Joined: {selectedEmp.joined}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <div className="text-lg font-black text-slate-900">{selectedEmp.salary}</div>
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase">Monthly CTC</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <div className="text-2xl font-black text-slate-900">{selectedEmp.projects}</div>
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase">Active Projects</div>
                  </div>
                </div>
                <Button size="sm" className="w-full text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => showToast(`Viewing full profile for ${selectedEmp.name}`)}>
                  Edit Employee Profile
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
