import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Search, CheckCircle2, X, Plus } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getDigitalAttendance, recordDigitalAttendance } from '../../lib/api/digital';

const EMPLOYEES = ['Arun Patel', 'Sneha Roy', 'Vivek Sharma', 'Riya Thomas', 'Karthik Menon', 'Anjali Nair'];

const statusClr: Record<string, string> = {
  'Present': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Late': 'bg-amber-50 text-amber-700 border-amber-200',
  'Absent': 'bg-red-50 text-red-700 border-red-200',
};

export const DigitalAttendance: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEmp, setFilterEmp] = useState('All');
  const [toast, setToast] = useState('');
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [markData, setMarkData] = useState({ emp: EMPLOYEES[0], date: new Date().toISOString().split('T')[0], status: 'Present', checkIn: '09:00 AM' });

  const loadData = async () => {
    setLoading(true);
    const data = await getDigitalAttendance();
    const formatted = data.map((d: any) => ({
      id: d.id,
      emp: d.employee_name || d.employee || 'Arun Patel',
      date: d.date,
      status: d.status,
      checkIn: d.check_in_time || d.checkIn || '09:00 AM',
      checkOut: d.check_out_time || d.checkOut || '06:00 PM',
    }));
    setRecords(formatted);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleMark = async (e: React.FormEvent) => {
    e.preventDefault();
    await recordDigitalAttendance({
      employee_name: markData.emp,
      date: markData.date,
      status: markData.status,
      check_in_time: markData.checkIn,
    });
    setShowMarkModal(false);
    showToast(`Attendance marked for ${markData.emp}`);
    await loadData();
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const filtered = records.filter((r: any) => {
    const matchS = r.emp.toLowerCase().includes(search.toLowerCase());
    const matchF = filterEmp === 'All' || r.emp === filterEmp;
    return matchS && matchF;
  });

  const presentToday = records.filter(r => (r.date === todayStr || r.date === '2026-08-06') && r.status === 'Present').length;
  const lateToday = records.filter(r => (r.date === todayStr || r.date === '2026-08-06') && r.status === 'Late').length;
  const absentToday = records.filter(r => (r.date === todayStr || r.date === '2026-08-06') && r.status === 'Absent').length;

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
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2"><Clock className="w-5 h-5 text-[#6A1B2E]" /> Attendance & Work Hours Tracking</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Monitor daily team attendance, check-in/check-out times, leaves, and attendance rates.</p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowMarkModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Mark Attendance
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading attendance records...</div>
      ) : null}

      <div className="grid grid-cols-3 gap-3">
        {[['Present Today', presentToday, 'text-emerald-700'], ['Late Today', lateToday, 'text-amber-700'], ['Absent Today', absentToday, 'text-red-700']].map(([l, c, clr], idx) => (
          <Card key={idx} className="p-4 border border-slate-200/70 shadow-xs text-center">
            <div className={`text-2xl font-black ${clr}`}>{c}</div>
            <div className="text-[10px] font-extrabold uppercase text-slate-400 mt-0.5">{l}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee name..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)} className="h-9 px-3 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#6A1B2E]">
          <option value="All">All Employees</option>
          {EMPLOYEES.map(e => <option key={e}>{e}</option>)}
        </select>
      </Card>

      <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Check-In</th>
                <th className="py-3 px-4">Check-Out</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filtered.map((r, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{r.emp}</td>
                  <td className="py-3 px-4">{r.date}</td>
                  <td className="py-3 px-4">{r.checkIn || '—'}</td>
                  <td className="py-3 px-4">{r.checkOut || '—'}</td>
                  <td className="py-3 px-4"><span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${statusClr[r.status]}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {showMarkModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowMarkModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Mark Attendance</h3>
                <button onClick={() => setShowMarkModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Employee</label>
                  <select value={markData.emp} onChange={e => setMarkData({...markData, emp: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                    {EMPLOYEES.map(e => <option key={e}>{e}</option>)}
                  </select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Status</label>
                    <select value={markData.status} onChange={e => setMarkData({...markData, status: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option>Present</option><option>Late</option><option>Absent</option>
                    </select></div>
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Check-In Time</label>
                    <input type="time" value="09:00" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowMarkModal(false)}>Cancel</Button>
                  <Button size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={handleMark}>Save Attendance</Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
