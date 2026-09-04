import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, TrendingUp, Eye, FileText, X, BarChart2, Plus, Star, Award } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getDigitalEmployees, createDigitalEmployee } from '../../lib/api/digital';

export const DigitalPerformance: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [showAddReviewModal, setShowAddReviewModal] = useState(false);
  const [toast, setToast] = useState('');

  const [reviewForm, setReviewForm] = useState({
    name: '',
    role: 'Fullstack Developer',
    department: 'Engineering',
    rating: 9.0,
    kpiScore: 95,
    feedback: 'Consistently delivers clean code ahead of sprint deadlines.'
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const empData = await getDigitalEmployees();

      const defaultPerformance = [
        { id: '1', name: 'Kavita Iyer', role: 'Principal Fullstack Architect', rating: 9.6, projects: 4, tasks: 28, kpi: 98, feedback: 'Architected high-throughput microservices and Next.js frontend with zero downtime.' },
        { id: '2', name: 'Sameer Sen', role: 'Lead Product Designer (UI/UX)', rating: 9.4, projects: 3, tasks: 22, kpi: 96, feedback: 'Created tokenized design system adopted across mobile and web platforms.' },
        { id: '3', name: 'Pooja Hegde', role: 'Senior SEO & Growth Strategist', rating: 9.1, projects: 5, tasks: 34, kpi: 93, feedback: 'Drove 140% surge in organic traffic and achieved Page #1 rankings.' },
        { id: '4', name: 'Rohan Joshi', role: 'Mobile Flutter Engineer', rating: 8.9, projects: 2, tasks: 19, kpi: 91, feedback: 'Implemented smooth animations and cross-platform push notification pipelines.' },
      ];

      if (Array.isArray(empData) && empData.length > 0) {
        const merged = empData.map((e, idx) => {
          const matched = defaultPerformance.find(d => d.name.toLowerCase() === e.name?.toLowerCase());
          return {
            id: e.id || `EMP-${idx + 1}`,
            name: e.name,
            role: e.role || 'Digital Specialist',
            rating: matched?.rating || 9.0,
            projects: matched?.projects || e.projectsCount || 2,
            tasks: matched?.tasks || 15,
            kpi: matched?.kpi || 92,
            feedback: matched?.feedback || 'Strong collaborator with excellent task completion rate.'
          };
        });
        setEmployees(merged);
      } else {
        setEmployees(defaultPerformance);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener('ferex_digital_employees_change', loadData);
    return () => window.removeEventListener('ferex_digital_employees_change', loadData);
  }, [loadData]);

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.name) return;

    await createDigitalEmployee({
      name: reviewForm.name,
      role: reviewForm.role,
      department: reviewForm.department,
      email: `${reviewForm.name.toLowerCase().replace(/\s+/g, '.')}@ferex.digital`
    });

    const newEntry = {
      id: `EMP-${Date.now().toString().slice(-4)}`,
      name: reviewForm.name,
      role: reviewForm.role,
      rating: Number(reviewForm.rating),
      projects: 1,
      tasks: 8,
      kpi: Number(reviewForm.kpiScore),
      feedback: reviewForm.feedback
    };

    setEmployees(prev => [newEntry, ...prev]);
    setShowAddReviewModal(false);
    showToast(`Recorded performance review for ${reviewForm.name}`);
    setReviewForm({
      name: '',
      role: 'Fullstack Developer',
      department: 'Engineering',
      rating: 9.0,
      kpiScore: 95,
      feedback: 'Consistently delivers clean code ahead of sprint deadlines.'
    });
  };

  const avgRating = employees.length > 0 ? (employees.reduce((sum, e) => sum + e.rating, 0) / employees.length).toFixed(1) : '9.2';
  const avgKpi = employees.length > 0 ? (employees.reduce((sum, e) => sum + e.kpi, 0) / employees.length).toFixed(1) : '94.5';

  return (
    <div className="space-y-6 text-left antialiased max-w-7xl mx-auto">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-rose-900/40"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart2 className="w-6 h-6 text-[#6A1B2E]" /> Team Performance & KPI Evaluation
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Real-time appraisal metrics across sprint delivery speed, code quality, UI elegance, and client CSAT ratings.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold shadow-md shadow-rose-950/10" onClick={() => setShowAddReviewModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Log Appraisal Review
        </Button>
      </div>

      {/* Top Refined KPI Widget Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 border border-emerald-100 bg-white shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Team Avg Rating</div>
            <div className="text-2xl font-black text-emerald-700">{avgRating} <span className="text-xs font-semibold text-slate-400">/ 10</span></div>
            <span className="text-[10px] font-semibold text-emerald-600 block flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" /> Top 5% Agency Performance
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <BarChart2 className="w-5 h-5 text-emerald-600" />
          </div>
        </Card>

        <Card className="p-4 border border-blue-100 bg-white shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Avg KPI Delivery Score</div>
            <div className="text-2xl font-black text-blue-700">{avgKpi}%</div>
            <span className="text-[10px] font-semibold text-blue-600 block flex items-center gap-1">
              <Award className="w-3 h-3" /> Exceeding Quarterly Benchmarks
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border border-purple-100 bg-white shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Active Team Size</div>
            <div className="text-2xl font-black text-purple-700">{employees.length} <span className="text-xs font-semibold text-slate-400">Members</span></div>
            <span className="text-[10px] font-semibold text-purple-600 block">
              100% On-Time Sprint Velocity
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-purple-600" />
          </div>
        </Card>
      </div>

      {/* Employee Performance Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs font-bold text-slate-400">Loading appraisal metrics...</div>
        ) : employees.map((emp) => (
          <Card key={emp.id} className="p-4 border border-slate-200/80 bg-white rounded-2xl shadow-xs hover:shadow-md transition-all space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6A1B2E] to-[#9B3A50] text-white flex items-center justify-center text-sm font-black shadow-xs shrink-0">
                  {emp.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-none">{emp.name}</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-1">{emp.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-current" /> {emp.rating} Rating
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
                  {emp.kpi}% KPI Score
                </span>
                <Button size="sm" variant="outline" className="text-xs font-bold" onClick={() => setSelectedEmp(emp)}>
                  <Eye className="w-3.5 h-3.5 mr-1" /> Dossier
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Active Projects</span>
                <div className="font-bold text-slate-800">{emp.projects} Projects</div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Completed Tasks</span>
                <div className="font-bold text-slate-800">{emp.tasks} Sprint Items</div>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Supervisor Assessment</span>
                <p className="text-xs text-slate-600 italic font-medium truncate">{emp.feedback}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ─── MODAL: ADD APPRAISAL REVIEW ─── */}
      <AnimatePresence>
        {showAddReviewModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddReviewModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-[#6A1B2E]" /> Record Employee Appraisal
                </h3>
                <button onClick={() => setShowAddReviewModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddReview} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Employee Name</label>
                  <input type="text" required value={reviewForm.name} onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })} placeholder="e.g. Vikram Chandra" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Role / Specialization</label>
                    <input type="text" required value={reviewForm.role} onChange={(e) => setReviewForm({ ...reviewForm, role: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Department</label>
                    <select value={reviewForm.department} onChange={(e) => setReviewForm({ ...reviewForm, department: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      <option value="Engineering">Engineering</option>
                      <option value="Design">Design</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Product">Product</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Rating (Out of 10)</label>
                    <input type="number" step="0.1" min="1" max="10" required value={reviewForm.rating} onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">KPI Score (%)</label>
                    <input type="number" min="50" max="100" required value={reviewForm.kpiScore} onChange={(e) => setReviewForm({ ...reviewForm, kpiScore: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Feedback & Recommendations</label>
                  <textarea rows={3} value={reviewForm.feedback} onChange={(e) => setReviewForm({ ...reviewForm, feedback: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddReviewModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Save Appraisal</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── DRAWER: EMPLOYEE DOSSIER ─── */}
      <AnimatePresence>
        {selectedEmp && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedEmp(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-base font-black text-slate-900">Employee Appraisal Dossier</h3>
                <button onClick={() => setSelectedEmp(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-[#6A1B2E] uppercase">Ferex Digital Talent Directory</span>
                  <h4 className="text-lg font-black text-slate-900">{selectedEmp.name}</h4>
                  <p className="text-xs font-semibold text-slate-500">{selectedEmp.role}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase">Performance Rating</span>
                    <div className="text-xl font-black text-emerald-700 mt-0.5">{selectedEmp.rating} / 10</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <span className="text-[10px] font-bold text-blue-800 uppercase">KPI Delivery Index</span>
                    <div className="text-xl font-black text-blue-700 mt-0.5">{selectedEmp.kpi}%</div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Qualitative Leadership Review</span>
                  <p className="text-xs text-slate-700 font-semibold leading-relaxed">{selectedEmp.feedback}</p>
                </div>

                <div className="pt-4">
                  <Button size="sm" className="w-full text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => setSelectedEmp(null)}>
                    Close Dossier
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
