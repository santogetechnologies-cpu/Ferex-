import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckSquare, Calendar, FileText, Sparkles,
  ArrowRight, CheckCircle2, Plus, Video
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const StaffDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  return (
    <div className="space-y-8 text-left antialiased select-none">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Linear-Style Executive Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#6A1B2E] via-[#521221] to-[#3B0B16] text-white p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase bg-white/20 text-white px-3 py-1 rounded-full border border-white/20 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Staff Advisory Executive Operations
              </span>
              <span className="text-[10px] font-bold text-emerald-300">● 98.4% Quality SLA</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">
              Welcome back, Arun Patel!
            </h1>
            <p className="text-xs text-white/80 font-semibold leading-relaxed">
              You have 4 assigned tasks requiring attention today, 2 scheduled student video consultations, and 3 university documents pending verification.
            </p>
          </div>
          <div className="flex gap-2.5 shrink-0">
            <Link to="/staff/tasks">
              <Button size="sm" className="bg-white text-[#6A1B2E] hover:bg-slate-100 font-black text-xs">
                Launch Task Board <ArrowRight className="w-3.5 h-3.5 ml-1.5 text-[#6A1B2E]" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Animated KPI Cards with Circular Gauges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Assigned Workload', val: '4 Pending', sub: '75% Daily Target Met', progress: 75, color: 'text-amber-700', bg: 'bg-amber-500', path: '/staff/tasks' },
          { label: 'Today\'s Consultations', val: '2 Scheduled', sub: 'Next: 02:30 PM IST', progress: 50, color: 'text-blue-700', bg: 'bg-blue-500', path: '/staff/meetings' },
          { label: 'Assigned Students', val: '18 Active', sub: '3 Visas Approved', progress: 90, color: 'text-emerald-700', bg: 'bg-emerald-500', path: '/staff/students' },
          { label: 'Pending Reviews', val: '3 Files', sub: 'UK & Canada CAS', progress: 40, color: 'text-[#6A1B2E]', bg: 'bg-[#6A1B2E]', path: '/staff/documents' },
        ].map((card, idx) => (
          <Card key={idx} onClick={() => navigate(card.path)} className="p-5 border border-slate-200/70 shadow-xs hover:shadow-md transition-all space-y-3 cursor-pointer group hover:border-slate-300">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">{card.label}</span>
            <div className={`text-xl font-black ${card.color}`}>{card.val}</div>
            <div className="space-y-1">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-1.5 rounded-full ${card.bg}`} style={{ width: `${card.progress}%` }} />
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 block">{card.sub}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Grid: Consultations Schedule & Assigned Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Schedule Timeline */}
          <Card className="p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" /> Today's Consultation Timeline
              </h3>
              <Link to="/staff/meetings" className="text-xs font-bold text-[#6A1B2E] hover:underline">View Calendar →</Link>
            </div>

            <div className="space-y-3">
              {[
                { title: 'Canada Study Visa SOP & Financial Audit Consultation', client: 'Priya Sharma (STU-842)', time: '02:30 PM - 03:00 PM IST', platform: 'Google Meet', status: 'Upcoming' },
                { title: 'UK CAS Letter & Deposit Receipt Verification', client: 'Rahul Verma (STU-889)', time: '04:15 PM - 04:45 PM IST', platform: 'Zoom Video', status: 'Scheduled' },
              ].map((m, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100/80 transition-all">
                  <div>
                    <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{m.time} • {m.platform}</span>
                    <h4 className="text-xs font-black text-slate-900">{m.title}</h4>
                    <span className="text-[11px] font-semibold text-slate-500">Student: {m.client}</span>
                  </div>
                  <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold shrink-0" onClick={() => showToast(`Launching ${m.platform} call...`)}>
                    <Video className="w-3.5 h-3.5 mr-1" /> Join Meeting
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          {/* Assigned Tasks Summary */}
          <Card className="p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#6A1B2E]" /> Assigned Tasks Workload
              </h3>
              <Link to="/staff/tasks" className="text-xs font-bold text-[#6A1B2E] hover:underline">Open Task Board →</Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-400">
                    <th className="py-2.5 px-3">Task Title</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Progress</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {[
                    { title: 'Verify Passport Scans for Priya Sharma', priority: 'High', due: 'Today', progress: 75 },
                    { title: 'Upload Manchester Offer Letter', priority: 'Medium', due: 'Tomorrow', progress: 40 },
                    { title: 'Review IELTS Test Report Form', priority: 'Low', due: 'Aug 10', progress: 100 },
                  ].map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 font-extrabold text-slate-900">{t.title}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${t.priority === 'High' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-600'}`}>{t.priority}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{t.due}</td>
                      <td className="py-3 px-3">
                        <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-[#6A1B2E] h-1.5 rounded-full" style={{ width: `${t.progress}%` }} />
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button onClick={() => showToast(`Updated: ${t.title}`)} className="text-[10px] font-black text-[#6A1B2E] hover:underline">Update</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Column: Student Pipeline & Quick Actions */}
        <div className="space-y-6">
          <Card className="p-5 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">Quick Actions</h3>
            <div className="space-y-2">
              <Button size="sm" variant="outline" className="w-full text-xs font-bold justify-start" onClick={() => showToast('Opening personal note editor...')}>
                <Plus className="w-4 h-4 mr-2 text-[#6A1B2E]" /> Add Advisory Note
              </Button>
              <Link to="/staff/documents">
                <Button size="sm" variant="outline" className="w-full text-xs font-bold justify-start mt-2">
                  <FileText className="w-4 h-4 mr-2 text-blue-600" /> Audit Assigned Document
                </Button>
              </Link>
            </div>
          </Card>

          {/* Student Pipeline Progression */}
          <Card className="p-5 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">Student Application Pipeline</h3>
            <div className="space-y-2 text-xs font-bold text-slate-700">
              <div className="flex justify-between"><span>Offer Received</span><span className="text-blue-700">8 Students</span></div>
              <div className="flex justify-between"><span>CAS / I-20 Lodged</span><span className="text-amber-700">5 Students</span></div>
              <div className="flex justify-between"><span>Visa Granted</span><span className="text-emerald-700">3 Students</span></div>
            </div>
          </Card>

          {/* Activity Feed */}
          <Card className="p-5 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">Activity Feed</h3>
            <div className="space-y-3 text-xs font-semibold relative pl-4 border-l-2 border-slate-200">
              {[
                { title: 'CAS Letter Approved', time: '10m ago', sub: 'Priya Sharma (STU-842)' },
                { title: 'Document Verified', time: '1h ago', sub: 'IELTS Scorecard Validated' },
                { title: 'Task Completed', time: '3h ago', sub: 'Application Form Submitted' },
              ].map((act, i) => (
                <div key={i} className="relative space-y-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#6A1B2E] absolute -left-[21px] top-1 border-2 border-white" />
                  <span className="text-[10px] text-slate-400 font-bold block">{act.time}</span>
                  <span className="font-bold text-slate-900 block">{act.title}</span>
                  <span className="text-[10.5px] text-slate-500 block">{act.sub}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
