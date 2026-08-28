import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Plus, Search, Mail, Trash2, X, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getStaffMembers } from '../../lib/api/students';

export const CentralAdmins: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const data = await getStaffMembers();
    const formatted = data.map((d: any, idx: number) => ({
      id: d.id || idx + 1,
      name: d.full_name || 'Staff Member',
      email: d.email,
      role: d.role === 'admin' ? 'Global Platform Admin' : 'Admissions Counselor',
      assignedStudents: 120,
      rating: '5.0 ★★★★★',
      status: 'Active',
      initials: (d.full_name || 'Staff').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
    }));
    setStaffList(formatted);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    role: 'Admissions Counselor'
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.email) return;
    const created = {
      id: Date.now(),
      ...newStaff,
      assignedStudents: 0,
      rating: '5.0 ★★★★★',
      status: 'Active',
      initials: newStaff.name.split(' ').map(n => n[0]).join('')
    };
    setStaffList([created, ...staffList]);
    setShowAddModal(false);
    showToastMsg(`Added ${newStaff.name} to staff team!`);
    setNewStaff({ name: '', email: '', role: 'Admissions Counselor' });
  };

  const handleDeleteStaff = (id: number) => {
    setStaffList(staffList.filter(s => s.id !== id));
    showToastMsg('Staff member removed');
  };

  const filteredStaff = staffList.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
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
            <ShieldCheck className="w-5 h-5 text-[#6A1B2E]" /> Admin & Counselor Staff
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Super Admin Console • Regional managers, counselors, and verification officers.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Staff Member
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading staff directory...</div>
      ) : null}

      <Card className="p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff name or role..."
            className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
          />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredStaff.length} Staff Active</span>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredStaff.map((staff) => (
          <Card key={staff.id} className="p-5 border border-slate-200/70 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#6A1B2E] text-white font-black text-sm flex items-center justify-center shadow-xs">
                    {staff.initials}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{staff.name}</h3>
                    <p className="text-xs font-semibold text-[#6A1B2E]">{staff.role}</p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {staff.status}
                </span>
              </div>

              <div className="space-y-2 text-xs font-semibold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{staff.email}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500 font-bold">Assigned Student Quota:</span>
                  <span className="font-extrabold text-slate-900">{staff.assignedStudents} Students</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-600">{staff.rating}</span>
              {staff.id !== 1 && (
                <button
                  onClick={() => handleDeleteStaff(staff.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Remove Staff"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Add Staff Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Add Staff Member</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddStaff} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Full Name</label>
                  <input type="text" required value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} placeholder="e.g. Vikram Singh" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Corporate Email</label>
                  <input type="email" required value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} placeholder="e.g. vikram@ferex.com" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Role Title</label>
                  <select value={newStaff.role} onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                    <option value="Admissions Counselor">Admissions Counselor</option>
                    <option value="Senior Admissions Officer">Senior Admissions Officer</option>
                    <option value="Visa & Document Specialist">Visa & Document Specialist</option>
                    <option value="Regional Representative">Regional Representative</option>
                  </select>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save Staff</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
