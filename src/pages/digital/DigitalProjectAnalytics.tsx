import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderKanban, CheckCircle2, Users, Target, Search, BarChart2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

const projectHealthList = [
  { id: 'PRJ-001', name: 'Reliance Digital E-Commerce Overhaul', client: 'Reliance Digital', teamLead: 'Arun Patel', health: 'Healthy', healthColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', progress: 65, tasksDone: 48, tasksTotal: 72, milestone: 'Beta Release Prep', status: 'On Track' },
  { id: 'PRJ-002', name: 'Tata Motors UI Redesign Portal', client: 'Tata Motors Digital', teamLead: 'Sneha Roy', health: 'Healthy', healthColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', progress: 34, tasksDone: 18, tasksTotal: 52, milestone: 'Wireframe Approval', status: 'On Track' },
  { id: 'PRJ-003', name: 'Mahindra Fintech Customer App', client: 'Mahindra Fintech', teamLead: 'Vivek Sharma', health: 'At Risk', healthColor: 'bg-amber-50 text-amber-700 border-amber-200', progress: 12, tasksDone: 6, tasksTotal: 50, milestone: 'Architecture Signoff', status: 'Pending Specs' },
  { id: 'PRJ-004', name: 'BigBasket SEO & Content Campaign', client: 'BigBasket Growth', teamLead: 'Riya Thomas', health: 'Healthy', healthColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', progress: 50, tasksDone: 25, tasksTotal: 50, milestone: 'Content Batch #3', status: 'On Track' },
  { id: 'PRJ-005', name: 'OYO Property Manager App', client: 'OYO Rooms', teamLead: 'Arun Patel', health: 'Delayed', healthColor: 'bg-red-50 text-red-700 border-red-200', progress: 28, tasksDone: 14, tasksTotal: 48, milestone: 'API Integration', status: 'Blocked' },
];

const teamWorkload = [
  { member: 'Arun Patel', role: 'Senior Developer', activeProjects: 3, allocatedHours: '38h / 40h', utilization: 95, status: 'Optimal' },
  { member: 'Sneha Roy', role: 'UI/UX Designer', activeProjects: 2, allocatedHours: '36h / 40h', utilization: 90, status: 'Optimal' },
  { member: 'Vivek Sharma', role: 'Mobile App Lead', activeProjects: 2, allocatedHours: '32h / 40h', utilization: 80, status: 'Optimal' },
  { member: 'Riya Thomas', role: 'SEO & Content', activeProjects: 3, allocatedHours: '35h / 40h', utilization: 88, status: 'Optimal' },
  { member: 'Karthik Menon', role: 'Marketing Analyst', activeProjects: 2, allocatedHours: '28h / 40h', utilization: 70, status: 'Available' },
];

export const DigitalProjectAnalytics: React.FC = () => {
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [healthFilter, setHealthFilter] = useState('All');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const filteredProjects = projectHealthList.filter(p => {
    const matchS = p.name.toLowerCase().includes(search.toLowerCase()) || p.client.toLowerCase().includes(search.toLowerCase());
    const matchH = healthFilter === 'All' || p.health === healthFilter;
    return matchS && matchH;
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

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-[#6A1B2E]" /> Project Delivery & Health Analytics
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Real-time delivery health, sprint burndown velocity, team capacity utilization, and milestone completion metrics.</p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => showToast('Exporting Project Performance Audit (PDF)...')}>
          <BarChart2 className="w-3.5 h-3.5 mr-1.5" /> Export Delivery Report
        </Button>
      </div>

      {/* Delivery KPI Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Running Projects', value: '14 Projects', note: '₹2.84 Cr Total Value', color: 'text-blue-700 bg-blue-50' },
          { label: 'Completed Projects (YTD)', value: '128 Projects', note: '98.6% Client Approval', color: 'text-emerald-700 bg-emerald-50' },
          { label: 'At-Risk / Delayed', value: '2 Projects', note: 'Action Plan Active', color: 'text-amber-700 bg-amber-50' },
          { label: 'Avg Team Utilization', value: '88.5%', note: '24 Capacity Allocated', color: 'text-[#6A1B2E] bg-[#6A1B2E]/10' },
        ].map((card, idx) => (
          <Card key={idx} className="p-4 border border-slate-200/70 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">{card.label}</span>
              <span className={`text-2xl font-black ${card.color.split(' ')[0]}`}>{card.value}</span>
            </div>
            <div className="text-[10px] font-semibold text-slate-500 mt-2 border-t border-slate-100 pt-1.5">{card.note}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Burndown Chart & Milestones */}
        <div className="lg:col-span-2 space-y-6">
          {/* Burndown Velocity SVG Chart */}
          <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-black text-slate-900">Sprint & Milestone Burndown Chart</h2>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">Ideal vs Actual Task Burndown Velocity across Active Sprints</p>
              </div>
              <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">On Velocity Target</span>
            </div>

            <div className="h-[200px] w-full relative">
              <svg className="w-full h-full" viewBox="0 0 500 180" preserveAspectRatio="none">
                <line x1="0" y1="40" x2="500" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="90" x2="500" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="140" x2="500" y2="140" stroke="#f1f5f9" strokeWidth="1" />

                {/* Ideal Burndown (Dashed Gray) */}
                <line x1="20" y1="20" x2="480" y2="160" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 5" />

                {/* Actual Burndown (Solid Maroon) */}
                <path d="M 20 20 L 100 45 L 180 75 L 260 95 L 340 120 L 420 145 L 480 155" fill="none" stroke="#6A1B2E" strokeWidth="3.5" strokeLinecap="round" />

                {[{ x: 20, y: 20 }, { x: 100, y: 45 }, { x: 180, y: 75 }, { x: 260, y: 95 }, { x: 340, y: 120 }, { x: 420, y: 145 }, { x: 480, y: 155 }].map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="4" fill="#6A1B2E" stroke="white" strokeWidth="2" />
                ))}
              </svg>
            </div>

            <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-400 px-1 select-none">
              {['Day 1', 'Day 3', 'Day 5', 'Day 7', 'Day 9', 'Day 12', 'Day 14'].map(d => <span key={d}>{d}</span>)}
            </div>

            <div className="flex items-center justify-center gap-6 pt-2 border-t border-slate-100 text-xs font-bold">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#6A1B2E]" /> Actual Remaining Tasks</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-slate-400 rounded" /> Ideal Burndown Line</span>
            </div>
          </Card>

          {/* Project Health & Milestone Matrix */}
          <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Project Performance & Health Status</h3>
              <div className="flex items-center gap-2">
                <div className="relative w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search projects..."
                    className="w-full h-8 pl-8 pr-3 bg-slate-100/70 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
                <select
                  value={healthFilter}
                  onChange={e => setHealthFilter(e.target.value)}
                  className="h-8 px-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold"
                >
                  <option value="All">All Health</option>
                  <option value="Healthy">Healthy</option>
                  <option value="At Risk">At Risk</option>
                  <option value="Delayed">Delayed</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {filteredProjects.map(p => (
                <div key={p.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5 hover:bg-slate-100/60 transition-all">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-[#6A1B2E]">{p.id}</span>
                        <h4 className="text-xs font-black text-slate-900">{p.name}</h4>
                      </div>
                      <p className="text-[10.5px] font-semibold text-slate-500">Client: {p.client} • Lead: {p.teamLead}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${p.healthColor}`}>{p.health}</span>
                  </div>

                  {/* Task Completion Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span>Tasks Done: {p.tasksDone} / {p.tasksTotal}</span>
                      <span>{p.progress}% Complete</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-2 rounded-full ${p.health === 'Delayed' ? 'bg-red-500' : p.health === 'At Risk' ? 'bg-amber-500' : 'bg-[#6A1B2E]'}`} style={{ width: `${p.progress}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10.5px] font-semibold text-slate-500 border-t border-slate-200/60 pt-2">
                    <span>Current Milestone: <span className="font-bold text-slate-800">{p.milestone}</span></span>
                    <button onClick={() => showToast(`Inspecting ${p.name}...`)} className="text-[#6A1B2E] font-extrabold hover:underline">View Timeline →</button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Panel — Workload & Resource Allocation */}
        <div className="space-y-6">
          {/* Team Workload & Allocation */}
          <Card className="p-5 border border-slate-200/70 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#6A1B2E]" /> Resource Allocation & Workload
              </h3>
            </div>
            <div className="space-y-3">
              {teamWorkload.map((m, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-slate-900 block">{m.member}</span>
                      <span className="text-[10px] font-semibold text-slate-400">{m.role}</span>
                    </div>
                    <span className="text-xs font-black text-slate-900">{m.utilization}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-1.5 rounded-full ${m.utilization > 90 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${m.utilization}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 pt-0.5">
                    <span>{m.activeProjects} Active Projects</span>
                    <span>{m.allocatedHours}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Milestone Target Deadlines */}
          <Card className="p-5 border border-slate-200/70 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-4 h-4 text-[#6A1B2E]" /> Upcoming Major Milestones
            </h3>
            <div className="space-y-2 text-xs font-semibold">
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 space-y-0.5">
                <span className="font-extrabold text-blue-950 block">Reliance E-Commerce Staging Release</span>
                <span className="text-[10px] text-blue-700 block">Due Aug 15 • Arun Patel</span>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100 space-y-0.5">
                <span className="font-extrabold text-purple-950 block">Tata Motors UI Design Prototype Handover</span>
                <span className="text-[10px] text-purple-700 block">Due Aug 20 • Sneha Roy</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
