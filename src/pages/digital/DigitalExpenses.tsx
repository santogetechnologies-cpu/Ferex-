import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, Search, Plus, X, CheckCircle2, Eye } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

const initialExpenses = [
  { id: 'EXP-001', description: 'AWS Cloud Infrastructure', category: 'Tech Infrastructure', amount: '₹42,000', date: '2026-08-01', submittedBy: 'Vivek Sharma', status: 'Approved' },
  { id: 'EXP-002', description: 'Adobe Creative Cloud Licenses (10 seats)', category: 'Software', amount: '₹28,500', date: '2026-08-01', submittedBy: 'Sneha Roy', status: 'Approved' },
  { id: 'EXP-003', description: 'Reliance Digital Client Site Visit', category: 'Travel', amount: '₹8,200', date: '2026-08-02', submittedBy: 'Arun Patel', status: 'Pending' },
  { id: 'EXP-004', description: 'Team Building Dinner — Q3 Kickoff', category: 'Team', amount: '₹18,400', date: '2026-08-03', submittedBy: 'Riya Thomas', status: 'Pending' },
  { id: 'EXP-005', description: 'Google Workspace Business Plan', category: 'Software', amount: '₹14,000', date: '2026-08-04', submittedBy: 'Arun Patel', status: 'Approved' },
];

const CATEGORIES = ['Tech Infrastructure', 'Software', 'Travel', 'Team', 'Marketing', 'Office', 'Other'];

const statusClr: Record<string, string> = {
  'Approved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Pending': 'bg-amber-50 text-amber-700 border-amber-200',
  'Rejected': 'bg-red-50 text-red-700 border-red-200',
};

export const DigitalExpenses: React.FC = () => {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [toast, setToast] = useState('');
  const [newExp, setNewExp] = useState({ description: '', category: 'Tech Infrastructure', amount: '', submittedBy: '', date: '' });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setExpenses([{ id: `EXP-${Math.floor(Math.random() * 900 + 6)}`, status: 'Pending', ...newExp }, ...expenses]);
    setShowAddModal(false);
    showToast('Expense submitted for approval!');
    setNewExp({ description: '', category: 'Tech Infrastructure', amount: '', submittedBy: '', date: '' });
  };

  const filtered = expenses.filter(e => e.description.toLowerCase().includes(search.toLowerCase()) || e.category.toLowerCase().includes(search.toLowerCase()));

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
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2"><Receipt className="w-5 h-5 text-[#6A1B2E]" /> Expense Management & Approvals</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Submit, review, and approve agency operational expenses. Track budgets and spending by category.</p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Submit Expense
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[['Total Expenses', `₹${(42000 + 28500 + 8200 + 18400 + 14000).toLocaleString('en-IN')}`, 'text-slate-900'],
          ['Approved', `₹${(42000 + 28500 + 14000).toLocaleString('en-IN')}`, 'text-emerald-700'],
          ['Pending Approval', `₹${(8200 + 18400).toLocaleString('en-IN')}`, 'text-amber-700']
        ].map(([label, value, clr], idx) => (
          <Card key={idx} className="p-4 border border-slate-200/70 shadow-xs">
            <div className={`text-lg font-black ${clr}`}>{value}</div>
            <div className="text-[10px] font-extrabold uppercase text-slate-400 mt-0.5">{label}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search expenses..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
      </Card>

      <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Submitted By</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filtered.map(exp => (
                <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-black text-[#6A1B2E]">{exp.id}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{exp.description}</td>
                  <td className="py-3.5 px-4 text-slate-600">{exp.category}</td>
                  <td className="py-3.5 px-4 font-black text-slate-900">{exp.amount}</td>
                  <td className="py-3.5 px-4 text-slate-700">{exp.submittedBy}</td>
                  <td className="py-3.5 px-4 text-slate-600">{exp.date}</td>
                  <td className="py-3.5 px-4"><span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${statusClr[exp.status]}`}>{exp.status}</span></td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setSelectedExpense(exp)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Eye className="w-4 h-4" /></button>
                      {exp.status === 'Pending' && (
                        <button onClick={() => { setExpenses(expenses.map(e => e.id === exp.id ? { ...e, status: 'Approved' } : e)); showToast('Expense approved!'); }} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-extrabold hover:bg-emerald-100 border border-emerald-200">Approve</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Submit Expense Claim</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3">
                <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Description</label>
                  <input type="text" required value={newExp.description} onChange={e => setNewExp({...newExp, description: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Category</label>
                    <select value={newExp.category} onChange={e => setNewExp({...newExp, category: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select></div>
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Amount (₹)</label>
                    <input type="text" required value={newExp.amount} onChange={e => setNewExp({...newExp, amount: e.target.value})} placeholder="₹0" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                </div>
                <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Submitted By</label>
                  <input type="text" required value={newExp.submittedBy} onChange={e => setNewExp({...newExp, submittedBy: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Date</label>
                  <input type="date" required value={newExp.date} onChange={e => setNewExp({...newExp, date: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Submit Claim</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedExpense && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedExpense(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Expense Details — {selectedExpense.id}</h3>
                <button onClick={() => setSelectedExpense(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border inline-block ${statusClr[selectedExpense.status]}`}>{selectedExpense.status}</span>
                <h4 className="text-sm font-black text-slate-900">{selectedExpense.description}</h4>
                <div className="text-xs font-semibold text-slate-600 space-y-1">
                  <p>Category: {selectedExpense.category}</p>
                  <p>Amount: <span className="text-xl font-black text-slate-900">{selectedExpense.amount}</span></p>
                  <p>Submitted By: {selectedExpense.submittedBy}</p>
                  <p>Date: {selectedExpense.date}</p>
                </div>
              </div>
              {selectedExpense.status === 'Pending' && (
                <div className="flex gap-2 mt-4">
                  <Button size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => { setExpenses(expenses.map(e => e.id === selectedExpense.id ? { ...e, status: 'Approved' } : e)); setSelectedExpense(null); showToast('Expense approved!'); }}>
                    Approve
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs font-bold text-red-600 border-red-200 hover:bg-red-50" onClick={() => { setExpenses(expenses.map(e => e.id === selectedExpense.id ? { ...e, status: 'Rejected' } : e)); setSelectedExpense(null); showToast('Expense rejected!'); }}>
                    Reject
                  </Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
