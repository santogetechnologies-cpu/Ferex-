import React, { useState } from 'react';
import { Activity, Search } from 'lucide-react';
import { Card } from '../../components/Card';

export const CentralActivity: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const [logs] = useState([
    { id: 'LOG-4801', user: 'Super Admin', action: 'BATCH_PAYOUT_AUTHORIZED', target: 'University of Warsaw Account', ip: '192.168.1.42', time: '2m ago', severity: 'Info' },
    { id: 'LOG-4802', user: 'Rahul Mehta', action: 'STUDENT_STAGE_UPDATED', target: 'Ashly (FX-2026-001) -> Stage 4', ip: '192.168.1.88', time: '18m ago', severity: 'Info' },
    { id: 'LOG-4803', user: 'System Enforcement', action: 'GLOBAL_2FA_POLICY_TOGGLED', target: 'Staff Authentication Module', ip: '127.0.0.1', time: '1h ago', severity: 'Warning' },
    { id: 'LOG-4804', user: 'Anita Roy', action: 'DOCUMENT_VERIFIED', target: 'Ashly_Passport_Scan.pdf', ip: '192.168.1.92', time: '2h ago', severity: 'Info' }
  ]);

  const filteredLogs = logs.filter(l =>
    l.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.action.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#6A1B2E]" /> Immutable Security Audit Logs
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Super Admin Console • Real-time audit trail, user actions, IP records, and security events.
          </p>
        </div>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search action, user, or IP..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredLogs.length} Audit Events</span>
      </Card>

      <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                <th className="py-3 px-4">Event ID & Timestamp</th>
                <th className="py-3 px-4">User Account</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Target Resource</th>
                <th className="py-3 px-4 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    <div>{log.id}</div>
                    <span className="text-[10px] font-semibold text-slate-400">{log.time}</span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{log.user}</td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-[11px] font-extrabold text-[#6A1B2E] bg-[#6A1B2E]/10 px-2 py-0.5 rounded border border-[#6A1B2E]/20">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{log.target}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-500">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
