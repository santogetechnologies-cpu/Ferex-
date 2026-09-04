import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  getDigitalClients,
  getDigitalProjects,
  getDigitalInvoices,
  getDigitalMeetings,
} from '../../lib/api/digital';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ClientData {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone?: string;
  industry?: string;
  status?: string;
}
interface Project { id: string; title: string; status: string; progress: number; service_category: string; deadline?: string; client_id: string; }
interface Invoice { id: string; invoice_no: string; amount: number; tax_amount?: number; status: string; due_date?: string; issued_at?: string; client_id?: string; }
interface Meeting { id: string; title: string; scheduled_at?: string; status?: string; client_id?: string; agenda?: string; }

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const statusColor: Record<string, string> = {
  'In Progress': '#3b82f6',
  'Completed': '#22c55e',
  'On Hold': '#f59e0b',
  'Cancelled': '#ef4444',
  Paid: '#22c55e',
  Sent: '#3b82f6',
  Draft: '#94a3b8',
  Overdue: '#ef4444',
  Scheduled: '#a78bfa',
  Done: '#22c55e',
  Pending: '#f59e0b',
};

// ─── Component ───────────────────────────────────────────────────────────────
const DigitalClientPortal: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [client, setClient] = useState<ClientData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'invoices' | 'meetings'>('overview');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const email = profile?.email?.toLowerCase();
      if (!email) return;

      // 1. Find the client record matching this email
      const allClients = await getDigitalClients();
      const myClient = allClients.find((c: ClientData) => c.email?.toLowerCase() === email);

      // 2. Fallback: also check ferex_admin_cred for client_id
      let clientId = myClient?.id;
      if (!clientId) {
        const credKey = `ferex_admin_cred_${email}`;
        const cred = localStorage.getItem(credKey);
        if (cred) {
          const parsed = JSON.parse(cred);
          if (parsed.client_id) clientId = parsed.client_id;
        }
      }

      if (myClient) setClient(myClient);
      else if (clientId) {
        const found = allClients.find((c: ClientData) => c.id === clientId);
        if (found) setClient(found);
      }

      const effectiveId = clientId || myClient?.id;
      if (!effectiveId) { setLoading(false); return; }

      // 3. Load client-specific data
      const [allProjects, allInvoices, allMeetings] = await Promise.all([
        getDigitalProjects(),
        getDigitalInvoices(),
        getDigitalMeetings(),
      ]);

      setProjects((allProjects as Project[]).filter((p) => p.client_id === effectiveId));
      setInvoices((allInvoices as Invoice[]).filter((i) => i.client_id === effectiveId));
      setMeetings((allMeetings as Meeting[]).filter((m) => m.client_id === effectiveId));
    } catch (e) {
      console.error('Client portal load error:', e);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('digital-client-portal-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_projects' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_invoices' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_meetings' }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // ─── Stats ───────────────────────────────────────────────────────────────
  const activeProjects = projects.filter((p) => p.status === 'In Progress').length;
  const completedProjects = projects.filter((p) => p.status === 'Completed').length;
  const totalInvoiced = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const pendingPayment = invoices.filter((i) => ['Sent', 'Overdue'].includes(i.status)).reduce((s, i) => s + (i.amount || 0), 0);
  const upcomingMeetings = meetings.filter((m) => m.status === 'Scheduled').length;

  // ─── Loading screen ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 48, height: 48, border: '4px solid #1e3a5f', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#64748b', fontSize: 14 }}>Loading your portal…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
      </div>
    );
  }

  const tabs: { key: typeof activeTab; label: string; count?: number }[] = [
    { key: 'overview', label: '📊 Overview' },
    { key: 'projects', label: '🚀 Projects', count: projects.length },
    { key: 'invoices', label: '🧾 Invoices', count: invoices.length },
    { key: 'meetings', label: '📅 Meetings', count: meetings.length },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ── Header ── */}
      <header style={{ background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1e293b', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff' }}>
            {(client?.company_name || 'C').charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>{client?.company_name || 'Client Portal'}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Ferex Digital — Client Dashboard</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 600 }}>{client?.contact_person || profile?.full_name}</div>
            <div style={{ fontSize: 11, color: '#475569' }}>{profile?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#f87171', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = 'rgba(239,68,68,0.2)'; }}
            onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'; }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        {/* Welcome */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
            Welcome back, {client?.contact_person?.split(' ')[0] || 'Client'} 👋
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 6 }}>
            Here's a real-time overview of your engagement with Ferex Digital Agency.
          </p>
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Active Projects', value: activeProjects, icon: '🚀', color: '#3b82f6' },
            { label: 'Completed', value: completedProjects, icon: '✅', color: '#22c55e' },
            { label: 'Total Invoiced', value: fmt(totalInvoiced), icon: '💰', color: '#a78bfa' },
            { label: 'Pending Payment', value: fmt(pendingPayment), icon: '⏳', color: '#f59e0b' },
            { label: 'Meetings', value: upcomingMeetings, icon: '📅', color: '#06b6d4' },
          ].map((card) => (
            <div key={card.label} style={{ background: '#1e293b', borderRadius: 14, padding: '20px 22px', border: `1px solid ${card.color}22`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 44, opacity: 0.08 }}>{card.icon}</div>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{card.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: card.color }}>{card.value}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#1e293b', padding: 4, borderRadius: 12, width: 'fit-content' }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                background: activeTab === t.key ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'transparent',
                color: activeTab === t.key ? '#fff' : '#64748b',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {t.label}
              {t.count !== undefined && (
                <span style={{ background: activeTab === t.key ? 'rgba(255,255,255,0.25)' : '#334155', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Recent Projects */}
            <div style={{ background: '#1e293b', borderRadius: 14, padding: 22, border: '1px solid #334155' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>🚀 Your Projects</h3>
              {projects.length === 0
                ? <p style={{ color: '#475569', fontSize: 13 }}>No projects yet. Contact your account manager.</p>
                : projects.slice(0, 4).map((p) => (
                    <div key={p.id} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{p.title}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: statusColor[p.status] || '#94a3b8', background: `${statusColor[p.status] || '#94a3b8'}18`, padding: '2px 8px', borderRadius: 6 }}>{p.status}</span>
                      </div>
                      <div style={{ height: 6, background: '#334155', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${p.progress || 0}%`, background: `linear-gradient(90deg, #3b82f6, #8b5cf6)`, borderRadius: 4, transition: 'width 0.6s ease' }} />
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{p.progress || 0}% complete · {p.service_category}</div>
                    </div>
                  ))
              }
            </div>

            {/* Recent Invoices */}
            <div style={{ background: '#1e293b', borderRadius: 14, padding: 22, border: '1px solid #334155' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>🧾 Recent Invoices</h3>
              {invoices.length === 0
                ? <p style={{ color: '#475569', fontSize: 13 }}>No invoices yet.</p>
                : invoices.slice(0, 5).map((inv) => (
                    <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1e3a5f' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{inv.invoice_no}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>Due: {inv.due_date || 'TBD'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{fmt(inv.amount)}</div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: statusColor[inv.status] || '#94a3b8', background: `${statusColor[inv.status] || '#94a3b8'}18`, padding: '1px 7px', borderRadius: 5 }}>{inv.status}</span>
                      </div>
                    </div>
                  ))
              }
            </div>

            {/* Upcoming Meetings */}
            <div style={{ background: '#1e293b', borderRadius: 14, padding: 22, border: '1px solid #334155', gridColumn: '1 / -1' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>📅 Upcoming Meetings</h3>
              {meetings.length === 0
                ? <p style={{ color: '#475569', fontSize: 13 }}>No meetings scheduled. Your account manager will reach out soon.</p>
                : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                    {meetings.slice(0, 4).map((m) => (
                      <div key={m.id} style={{ background: '#0f172a', borderRadius: 10, padding: '14px 16px', border: '1px solid #1e3a5f' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{m.title}</div>
                        {m.scheduled_at && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>📅 {new Date(m.scheduled_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>}
                        {m.agenda && <div style={{ fontSize: 12, color: '#94a3b8' }}>{m.agenda}</div>}
                        <span style={{ fontSize: 11, color: statusColor[m.status || 'Scheduled'] || '#a78bfa', fontWeight: 700 }}>{m.status || 'Scheduled'}</span>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        )}

        {/* ── Projects Tab ── */}
        {activeTab === 'projects' && (
          <div style={{ background: '#1e293b', borderRadius: 14, padding: 24, border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>All Your Projects</h3>
            {projects.length === 0
              ? <div style={{ textAlign: 'center', padding: 48, color: '#475569' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🚀</div>
                  <p>No projects yet. Your account manager will onboard you soon.</p>
                </div>
              : projects.map((p) => (
                  <div key={p.id} style={{ background: '#0f172a', borderRadius: 12, padding: '18px 20px', marginBottom: 12, border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{p.title}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{p.service_category} {p.deadline ? `· Due ${p.deadline}` : ''}</div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: statusColor[p.status] || '#94a3b8', background: `${statusColor[p.status] || '#94a3b8'}18`, padding: '4px 12px', borderRadius: 8, whiteSpace: 'nowrap' }}>{p.status}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, height: 8, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${p.progress || 0}%`, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6', minWidth: 42 }}>{p.progress || 0}%</span>
                    </div>
                  </div>
                ))
            }
          </div>
        )}

        {/* ── Invoices Tab ── */}
        {activeTab === 'invoices' && (
          <div style={{ background: '#1e293b', borderRadius: 14, padding: 24, border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Invoice History</h3>
            {invoices.length === 0
              ? <div style={{ textAlign: 'center', padding: 48, color: '#475569' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
                  <p>No invoices found for your account.</p>
                </div>
              : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                      {['Invoice #', 'Amount', 'Tax', 'Due Date', 'Status'].map((h) => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '14px 12px', color: '#e2e8f0', fontWeight: 600 }}>{inv.invoice_no}</td>
                        <td style={{ padding: '14px 12px', color: '#f1f5f9', fontWeight: 700 }}>{fmt(inv.amount)}</td>
                        <td style={{ padding: '14px 12px', color: '#94a3b8' }}>{fmt(inv.tax_amount || 0)}</td>
                        <td style={{ padding: '14px 12px', color: '#94a3b8' }}>{inv.due_date || '—'}</td>
                        <td style={{ padding: '14px 12px' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: statusColor[inv.status] || '#94a3b8', background: `${statusColor[inv.status] || '#94a3b8'}18`, padding: '3px 10px', borderRadius: 6 }}>{inv.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </div>
        )}

        {/* ── Meetings Tab ── */}
        {activeTab === 'meetings' && (
          <div style={{ background: '#1e293b', borderRadius: 14, padding: 24, border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Scheduled Meetings</h3>
            {meetings.length === 0
              ? <div style={{ textAlign: 'center', padding: 48, color: '#475569' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
                  <p>No meetings scheduled. Your account manager will reach out soon.</p>
                </div>
              : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {meetings.map((m) => (
                    <div key={m.id} style={{ background: '#0f172a', borderRadius: 12, padding: '18px 20px', border: '1px solid #1e3a5f' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{m.title}</div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: statusColor[m.status || 'Scheduled'], background: `${statusColor[m.status || 'Scheduled']}18`, padding: '2px 8px', borderRadius: 5, whiteSpace: 'nowrap' }}>{m.status || 'Scheduled'}</span>
                      </div>
                      {m.scheduled_at && (
                        <div style={{ fontSize: 13, color: '#a78bfa', marginBottom: 8, fontWeight: 600 }}>
                          📅 {new Date(m.scheduled_at).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {m.agenda && <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>{m.agenda}</p>}
                    </div>
                  ))}
                </div>
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default DigitalClientPortal;
