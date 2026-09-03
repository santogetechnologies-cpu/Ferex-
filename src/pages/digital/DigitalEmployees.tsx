import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Plus, X, CheckCircle2, Mail, Trash2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getDigitalEmployees, createDigitalEmployee, deleteDigitalEmployee } from '../../lib/api/digital';

export const DigitalEmployees: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [newEmp, setNewEmp] = useState({ name: '', role: '', department: 'Engineering', email: '' });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDigitalEmployees();
      setEmployees(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_digital_employees_change', handleLocalChange);

    return () => {
      window.removeEventListener('ferex_digital_employees_change', handleLocalChange);
    };
  }, [loadData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.name) return;
    await createDigitalEmployee(newEmp);
    setShowAddModal(false);
    showToast(`Added team member ${newEmp.name}`);
    setNewEmp({ name: '', role: '', department: 'Engineering', email: '' });
    await loadData();
  };

  const handleDelete = async (id: string, name: string) => {
    await deleteDigitalEmployee(id);
    setEmployees(prev => prev.filter(e => e.id !== id));
    showToast(`Removed team member ${name}`);
  };

  const filtered = employees.filter(e =>
    (e.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.role || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.department || '').toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#6A1B2E]" /> Engineering & Design Roster
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Digital ERP • Fullstack architects, UI/UX designers, growth strategists, and Flutter devs.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Team Member
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team member, role, or dept..."
            className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
          />
        </div>
        <span className="text-xs font-bold text-slate-400">{filtered.length} Engineering Staff</span>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading roster...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {filtered.map((e) => (
            <Card key={e.id} className="p-5 border border-slate-200/70 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-[#6A1B2E] bg-[#6A1B2E]/10 px-2 py-0.5 rounded-md">{e.department}</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">{e.status || 'Active'}</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{e.name}</h3>
                  <p className="text-xs font-semibold text-slate-500">{e.role}</p>
                </div>
                <div className="text-xs text-slate-600 truncate flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {e.email}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500">{e.projectsCount || 1} Active Sprints</span>
                <button onClick={() => handleDelete(e.id, e.name)} className="p-1 text-slate-400 hover:text-red-600 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Add Engineering Member</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Full Name</label>
                  <input type="text" required value={newEmp.name} onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })} placeholder="Kavita Iyer" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Role Title</label>
                    <input type="text" required value={newEmp.role} onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })} placeholder="Principal Architect" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Department</label>
                    <select value={newEmp.department} onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="Engineering">Engineering</option>
                      <option value="Design">Design</option>
                      <option value="Marketing">Marketing</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Agency Email</label>
                  <input type="email" required value={newEmp.email} onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })} placeholder="k.iyer@ferex.digital" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save Member</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
