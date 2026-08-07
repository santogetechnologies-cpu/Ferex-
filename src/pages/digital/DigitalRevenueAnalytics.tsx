import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Download, TrendingUp, CheckCircle2, Calendar } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

const serviceWiseRevenue = [
  { service: 'Web Development', total: '₹18,20,000', margin: '54%', clients: 3, share: 42.5 },
  { service: 'Mobile App Engineering', total: '₹8,40,000', margin: '48%', clients: 2, share: 19.6 },
  { service: 'UI/UX Design Studio', total: '₹5,50,000', margin: '62%', clients: 3, share: 12.8 },
  { service: 'Digital Marketing Campaigns', total: '₹4,80,000', margin: '45%', clients: 4, share: 11.2 },
  { service: 'SEO & Content Retainers', total: '₹3,90,000', margin: '68%', clients: 2, share: 9.1 },
  { service: 'Brand Identity Systems', total: '₹1,98,000', margin: '58%', clients: 2, share: 4.8 },
];

const topClientsRevenue = [
  { rank: '#1', client: 'Reliance Digital', revenue: '₹14,50,000', ret: 'Enterprise Contract', status: 'Paid On-Time' },
  { rank: '#2', client: 'Tata Motors Digital', revenue: '₹8,20,000', ret: 'Enterprise Contract', status: 'Pending ₹2.8L' },
  { rank: '#3', client: 'Mahindra Fintech', revenue: '₹6,00,000', ret: 'Enterprise Contract', status: 'Advance Received' },
  { rank: '#4', client: 'BigBasket Growth', revenue: '₹5,10,000', ret: 'Monthly Retainer', status: 'Paid On-Time' },
  { rank: '#5', client: 'HDFC Life Insurance', revenue: '₹4,50,000', ret: 'Fixed Project', status: 'Paid On-Time' },
];

export const DigitalRevenueAnalytics: React.FC = () => {
  const [toast, setToast] = useState('');
  const [fiscalYear, setFiscalYear] = useState('FY 2026-27');
  const [viewMode, setViewMode] = useState('Monthly');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CFO Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#6A1B2E]" /> CFO Financial Analytics & Revenue Console
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Real-time revenue metrics, profit margins, cash flow dynamics, service-line profitability, and revenue projections.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-[#6A1B2E]" />
            <select value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer">
              <option>FY 2026-27</option>
              <option>FY 2025-26</option>
            </select>
          </div>
          <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => showToast('Financial Statement exported (PDF/Excel)!')}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export CFO Report
          </Button>
        </div>
      </div>

      {/* Top CFO Key Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'August Revenue', value: '₹42.8 Lakhs', growth: '+18.4% MoM', note: 'Record Month', color: 'text-emerald-700 bg-emerald-50' },
          { label: 'Yearly Run Rate (ARR)', value: '₹5.13 Crore', growth: '+24.2% YoY', note: 'Projected Annual', color: 'text-blue-700 bg-blue-50' },
          { label: 'Net Operating Profit', value: '₹21.6 Lakhs', growth: '50.4% Margin', note: 'EBITDA Margin', color: 'text-purple-700 bg-purple-50' },
          { label: 'Total Operating Expenses', value: '₹21.2 Lakhs', growth: 'Payroll & AWS', note: '49.6% Expense Ratio', color: 'text-amber-700 bg-amber-50' },
        ].map((card, idx) => (
          <Card key={idx} className="p-5 border border-slate-200/70 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">{card.label}</span>
              <div className="text-2xl font-black text-slate-900">{card.value}</div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
              <span className={`font-black ${card.color.split(' ')[0]}`}>{card.growth}</span>
              <span className="font-semibold text-slate-400">{card.note}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Financial Charts & Growth Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Revenue vs Expenses SVG Chart */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-black text-slate-900">Revenue, Expenses & Profit Trend (₹ Lakhs)</h2>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">8-Month Financial Trajectory across Agency Operations</p>
              </div>
              <div className="flex items-center gap-2">
                {['Monthly', 'Quarterly'].map(m => (
                  <button key={m} onClick={() => setViewMode(m)} className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all ${viewMode === m ? 'bg-[#6A1B2E] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{m}</button>
                ))}
              </div>
            </div>

            <div className="h-[220px] w-full relative">
              <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                {/* Grid lines */}
                <line x1="0" y1="40" x2="600" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="90" x2="600" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="140" x2="600" y2="140" stroke="#f1f5f9" strokeWidth="1" />

                {/* Revenue Line (Green) */}
                <path d="M 0 160 L 80 140 L 165 135 L 250 110 L 335 90 L 420 70 L 505 50 L 590 30" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
                
                {/* Expenses Line (Red) */}
                <path d="M 0 180 L 80 170 L 165 165 L 250 150 L 335 145 L 420 135 L 505 130 L 590 120" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="4 4" strokeLinecap="round" />

                {/* Net Profit Line (Maroon) */}
                <path d="M 0 190 L 80 180 L 165 180 L 250 160 L 335 140 L 420 120 L 505 110 L 590 95" fill="none" stroke="#6A1B2E" strokeWidth="3" strokeLinecap="round" />

                {/* Dots for Revenue */}
                {[
                  { x: 0, y: 160 }, { x: 80, y: 140 }, { x: 165, y: 135 }, { x: 250, y: 110 },
                  { x: 335, y: 90 }, { x: 420, y: 70 }, { x: 505, y: 50 }, { x: 590, y: 30 }
                ].map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="4" fill="#10b981" stroke="white" strokeWidth="2" />
                ))}
              </svg>
            </div>

            <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-400 px-1 select-none">
              {MONTHS.map(m => <span key={m}>{m}</span>)}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-2 border-t border-slate-100 text-xs font-bold">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Revenue (₹42.8L)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#6A1B2E]" /> Net Profit (₹21.6L)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-red-500 rounded" /> Expenses (₹21.2L)</span>
            </div>
          </Card>

          {/* Service Line Profitability Table */}
          <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Service Line Financial Breakdown</h3>
              <span className="text-xs font-bold text-[#6A1B2E] hover:underline cursor-pointer" onClick={() => showToast('Exporting Service Breakdown...')}>Download Breakdown</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-2.5 px-3">Service Line</th>
                    <th className="py-2.5 px-3">Gross Revenue</th>
                    <th className="py-2.5 px-3">Share %</th>
                    <th className="py-2.5 px-3">Profit Margin</th>
                    <th className="py-2.5 px-3 text-right">Active Accounts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {serviceWiseRevenue.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-extrabold text-slate-900">{s.service}</td>
                      <td className="py-3 px-3 font-black text-slate-900">{s.total}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-1.5 rounded-full bg-[#6A1B2E]" style={{ width: `${s.share}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500">{s.share}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-black text-emerald-600">{s.margin}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800">{s.clients} Clients</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* CFO Right Panel */}
        <div className="space-y-6">
          {/* Top Client Revenue Rankings */}
          <Card className="p-5 border border-slate-200/70 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Top Client Accounts by Revenue</h3>
            <div className="space-y-3">
              {topClientsRevenue.map((c, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-[#6A1B2E] text-white text-[10px] font-black flex items-center justify-center">{c.rank}</span>
                      {c.client}
                    </span>
                    <span className="text-xs font-black text-slate-900">{c.revenue}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 pl-7">
                    <span>{c.ret}</span>
                    <span className={`font-bold ${c.status.includes('Paid') ? 'text-emerald-600' : 'text-amber-600'}`}>{c.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Revenue Forecast (Q3/Q4 Projections) */}
          <Card className="p-5 border border-slate-200/70 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#6A1B2E]" /> Q3/Q4 Financial Forecast
            </h3>
            <div className="p-4 bg-[#6A1B2E]/5 rounded-2xl border border-[#6A1B2E]/10 space-y-2">
              <div className="flex justify-between items-center text-xs font-extrabold text-slate-900">
                <span>Q3 Revenue Target</span>
                <span className="font-black text-[#6A1B2E]">₹1.35 Crore</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-2 rounded-full bg-[#6A1B2E]" style={{ width: '84%' }} />
              </div>
              <div className="flex justify-between text-[10px] font-semibold text-slate-500 pt-0.5">
                <span>Current Secured: ₹1.13 Cr (84%)</span>
                <span>Remaining: ₹22L</span>
              </div>
            </div>
          </Card>

          {/* Cash Flow Summary */}
          <Card className="p-5 border border-slate-200/70 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Cash Flow & Working Capital</h3>
            <div className="space-y-2 text-xs font-semibold text-slate-600">
              <div className="flex justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <span>Inbound Collections (Aug)</span>
                <span className="font-black text-emerald-950">₹38,50,000</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-red-50 border border-red-100">
                <span>Outbound Expenses & Vendor Pay</span>
                <span className="font-black text-red-950">₹18,40,000</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-blue-50 border border-blue-100">
                <span>Net Cash Position</span>
                <span className="font-black text-blue-950">+₹20,10,000</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
