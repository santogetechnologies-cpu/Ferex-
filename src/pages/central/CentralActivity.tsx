import React, { useState, useEffect } from 'react';
import { Activity, Search } from 'lucide-react';
import { Card } from '../../components/Card';
import { getActivityLogs } from '../../lib/api/activity';

export const CentralActivity: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await getActivityLogs(50);
      const mapped = data.map((l: any) => ({
        id: l.id ? `LOG-${l.id.slice(0, 6).toUpperCase()}` : 'LOG-EVENT',
        user: l.user_id ? `User (${l.user_id.slice(0, 8)})` : 'System Enforcement',
        action: l.action,
        target: l.entity_type ? `${l.entity_type}${l.entity_id ? ` (#${l.entity_id.slice(0, 6)})` : ''}` : 'Global Resource',
        ip: l.ip_address || '127.0.0.1',
        time: l.created_at ? new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
        severity: 'Info'
      }));
      setLogs(mapped);
      setLoading(false);
    };
    load();
  }, []);

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

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading audit logs...</div>
      ) : null}

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
