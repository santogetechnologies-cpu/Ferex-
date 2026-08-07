import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, TrendingUp, Users, Globe, FileText } from 'lucide-react';

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
const appData = [12, 18, 24, 30, 22, 38, 45, 52];
const paymentData = [85, 120, 165, 200, 145, 230, 280, 310];

const countryData = [
  { country: 'India', count: 142, pct: 57 },
  { country: 'UAE', count: 38, pct: 15 },
  { country: 'Qatar', count: 24, pct: 10 },
  { country: 'Oman', count: 18, pct: 7 },
  { country: 'Mexico', count: 14, pct: 6 },
  { country: 'Others', count: 11, pct: 4 },
];

const docStatusData = [
  { label: 'Verified', count: 312, pct: 65, color: 'bg-emerald-500' },
  { label: 'Pending', count: 98, pct: 20, color: 'bg-amber-500' },
  { label: 'Rejected', count: 42, pct: 9, color: 'bg-red-500' },
  { label: 'Re-upload', count: 28, pct: 6, color: 'bg-blue-500' },
];

const universityData = [
  { name: 'University of Warsaw', country: 'Poland', applications: 68 },
  { name: 'TU Berlin', country: 'Germany', applications: 54 },
  { name: 'University of Amsterdam', country: 'Netherlands', applications: 41 },
  { name: 'Leiden University', country: 'Netherlands', applications: 38 },
  { name: 'Jagiellonian University', country: 'Poland', applications: 33 },
];

const BarChart: React.FC<{ data: number[]; labels: string[]; color: string; unit?: string }> = ({ data, labels, color, unit = '' }) => {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-2 h-28">
      {data.map((val, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[8px] font-bold text-slate-400">{unit}{val}</span>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(val / max) * 100}%` }}
            transition={{ duration: 0.6, delay: i * 0.05 }}
            className={`w-full rounded-t-md ${color} hover:opacity-80 cursor-pointer transition-opacity`}
          />
          <span className="text-[8px] font-semibold text-slate-400">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
};

export const AdminReports: React.FC = () => {
  const [period, setPeriod] = useState('This Year');
  const [toast, setToast] = useState('');

  const handleExport = (type: string) => {
    const a = document.createElement('a');
    a.href = 'data:text/csv,Ferex Report Export';
    a.download = `Ferex_${type}_Report.csv`;
    a.click();
    setToast(`${type} report exported!`);
    setTimeout(() => setToast(''), 2500);
  };

  return (
    <div className="space-y-6 relative">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-3">
          <Download className="w-5 h-5 text-emerald-400" /> {toast}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Reports & Analytics</h1>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">Insights across students, applications and payments</p>
        </div>
        <div className="flex items-center gap-2">
          {['This Week', 'This Month', 'This Year'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`h-8 px-3 rounded-xl text-[10px] font-extrabold border transition-all
                ${period === p ? 'bg-[#6A1B2E] text-white border-[#6A1B2E]' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
              {p}
            </button>
          ))}
          <button onClick={() => handleExport('Full')}
            className="flex items-center gap-1.5 h-8 px-3.5 bg-[#6A1B2E] text-white text-[10px] font-bold rounded-xl hover:bg-[#4A101E] transition-all shadow-sm">
            <Download className="w-3.5 h-3.5" /> Export All
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: '247', change: '+18%', icon: Users, bg: 'bg-blue-50 text-blue-600' },
          { label: 'Applications', value: '312', change: '+24%', icon: FileText, bg: 'bg-violet-50 text-violet-600' },
          { label: 'Revenue', value: '₹28.4L', change: '+31%', icon: TrendingUp, bg: 'bg-emerald-50 text-emerald-600' },
          { label: 'Countries', value: '14', change: '+3 new', icon: Globe, bg: 'bg-amber-50 text-amber-600' },
        ].map(({ label, value, change, icon: Icon, bg }) => (
          <div key={label} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg} mb-3`}><Icon className="w-4.5 h-4.5" /></div>
            <p className="text-2xl font-extrabold text-slate-900">{value}</p>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="text-[10px] font-bold text-emerald-600 mt-1">↑ {change} vs last period</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Applications chart */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Applications Over Time</h3>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Monthly application volume — {period}</p>
            </div>
            <button onClick={() => handleExport('Applications')}
              className="flex items-center gap-1 text-[10px] font-bold text-[#6A1B2E] hover:underline">
              <Download className="w-3 h-3" /> Export
            </button>
          </div>
          <BarChart data={appData} labels={monthLabels} color="bg-[#6A1B2E]/70" />
        </div>

        {/* Document status donut-style */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-extrabold text-slate-900">Document Status</h3>
            <button onClick={() => handleExport('Documents')} className="flex items-center gap-1 text-[10px] font-bold text-[#6A1B2E] hover:underline">
              <Download className="w-3 h-3" /> Export
            </button>
          </div>
          <div className="space-y-3">
            {docStatusData.map(({ label, count, pct, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-700">{label}</span>
                  <span className="text-xs font-extrabold text-slate-900">{count}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, delay: 0.1 }}
                    className={`h-full rounded-full ${color}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Students by country */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-extrabold text-slate-900">Students by Country</h3>
            <button onClick={() => handleExport('Countries')} className="flex items-center gap-1 text-[10px] font-bold text-[#6A1B2E] hover:underline">
              <Download className="w-3 h-3" /> Export
            </button>
          </div>
          <div className="space-y-3">
            {countryData.map(({ country, count, pct }) => (
              <div key={country}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-700">{country}</span>
                  <span className="text-xs font-extrabold text-slate-600">{count} <span className="text-[10px] text-slate-400">({pct}%)</span></span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }}
                    className="h-full rounded-full bg-[#6A1B2E]/60" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top universities */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-extrabold text-slate-900">Top Universities</h3>
            <button onClick={() => handleExport('Universities')} className="flex items-center gap-1 text-[10px] font-bold text-[#6A1B2E] hover:underline">
              <Download className="w-3 h-3" /> Export
            </button>
          </div>
          <div className="space-y-3">
            {universityData.map(({ name, applications }, idx) => (
              <div key={name} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-xs font-extrabold text-slate-400 w-5 shrink-0">#{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-slate-900 truncate">{name}</p>
                </div>
                <span className="text-xs font-extrabold text-[#6A1B2E] shrink-0">{applications}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment chart */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Payment Revenue (₹ thousands)</h3>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Monthly payment collection — {period}</p>
          </div>
          <button onClick={() => handleExport('Payments')} className="flex items-center gap-1 text-[10px] font-bold text-[#6A1B2E] hover:underline">
            <Download className="w-3 h-3" /> Export
          </button>
        </div>
        <BarChart data={paymentData} labels={monthLabels} color="bg-emerald-500/70" unit="₹" />
      </div>
    </div>
  );
};
