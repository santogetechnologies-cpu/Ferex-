import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  ensureChatConversation, listChatThreads, getChatMessages, sendChatMessage, markChatRead, subscribeToChat,
  type ChatThread, type ChatMsg,
} from '../lib/api/chat';
import { getStudents } from '../lib/api/students';
import { BlockCap } from './CapLoader';

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Support chat on the real chat tables.
 * student: the student's own thread with their counselor (created on first open).
 * staff: threads the database lets the user see, plus a picker to start a chat with any student.
 */
export function ChatPanel({ mode, studentId }: { mode: 'student' | 'staff'; studentId?: string }) {
  const { user, profile } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [usersMap, setUsersMap] = useState<Record<string, { name: string; role: string; email: string }>>({});
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const asStudent = mode === 'student';

  const loadThreads = useCallback(async () => {
    try {
      if (asStudent) {
        if (!studentId) return;
        const id = await ensureChatConversation(studentId);
        setActiveId(current => current ?? id);
      }
      const list = await listChatThreads();
      const ids = Array.from(new Set([
        ...list.flatMap(t => [t.student_id, t.counselor_id].filter(Boolean) as string[]),
        user?.id,
      ].filter(Boolean) as string[]));
      if (ids.length) {
        const { data } = await supabase.from('users').select('id, full_name, email, role').in('id', ids);
        if (data) {
          const uMap: Record<string, { name: string; role: string; email: string }> = {};
          const nMap: Record<string, string> = {};
          for (const u of data as any[]) {
            const displayName = u.full_name || u.email || 'User';
            uMap[u.id] = { name: displayName, role: u.role || '', email: u.email || '' };
            nMap[u.id] = displayName;
          }
          setUsersMap(prev => ({ ...prev, ...uMap }));
          setNames(prev => ({ ...prev, ...nMap }));
        }
      }
      setThreads(list);
      if (!asStudent) setActiveId(current => current ?? list[0]?.id ?? null);
      setError('');
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, [asStudent, studentId, user?.id]);

  useEffect(() => { loadThreads(); }, [loadThreads]);
  useEffect(() => {
    if (asStudent) return;
    getStudents().then(list => setStudents(list.map(s => ({ id: s.id, name: s.full_name || s.email || 'Student' })))).catch(() => {});
  }, [asStudent]);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    let cancelled = false;
    getChatMessages(activeId).then(async list => {
      if (!cancelled) {
        setMessages(list);
        const senderIds = Array.from(new Set(list.map(m => m.sender_id).filter(Boolean)));
        if (senderIds.length) {
          const { data } = await supabase.from('users').select('id, full_name, email, role').in('id', senderIds);
          if (data && !cancelled) {
            const uMap: Record<string, { name: string; role: string; email: string }> = {};
            const nMap: Record<string, string> = {};
            for (const u of data as any[]) {
              const displayName = u.full_name || u.email || 'User';
              uMap[u.id] = { name: displayName, role: u.role || '', email: u.email || '' };
              nMap[u.id] = displayName;
            }
            setUsersMap(prev => ({ ...prev, ...uMap }));
            setNames(prev => ({ ...prev, ...nMap }));
          }
        }
      }
    }).catch(e => setError((e as Error).message));

    markChatRead(activeId, asStudent).then(loadThreads).catch(() => {});
    const stop = subscribeToChat(activeId, async m => {
      setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
      if (m.sender_id) {
        const { data } = await supabase.from('users').select('id, full_name, email, role').eq('id', m.sender_id).maybeSingle();
        if (data) {
          const displayName = data.full_name || data.email || 'User';
          setUsersMap(prev => ({ ...prev, [data.id]: { name: displayName, role: data.role || '', email: data.email || '' } }));
          setNames(prev => ({ ...prev, [data.id]: displayName }));
        }
      }
      if (m.sender_id !== user?.id) markChatRead(activeId, asStudent).catch(() => {});
      loadThreads();
    });
    return () => { cancelled = true; stop(); };
  }, [activeId, asStudent, user?.id, loadThreads]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const titleOf = (t: ChatThread) => asStudent
    ? (t.counselor_id ? names[t.counselor_id] : '') || 'Admissions Counselor'
    : names[t.student_id] || 'Student';

  const visible = useMemo(() => threads.filter(t =>
    titleOf(t).toLowerCase().includes(search.toLowerCase()) || (t.last_message || '').toLowerCase().includes(search.toLowerCase())
  ), [threads, names, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = threads.find(t => t.id === activeId);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !activeId || !user) return;
    setText('');
    try {
      const myName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      const myRole = profile?.role || user.user_metadata?.role || (asStudent ? 'student' : 'admin');
      if (user.id) {
        setUsersMap(prev => ({ ...prev, [user.id]: { name: myName, role: myRole, email: user.email || '' } }));
      }
      const sent = await sendChatMessage({ conversation_id: activeId, sender_id: user.id, content: body });
      const sentWithRole = { ...sent, sender_role: sent.sender_role || myRole };
      setMessages(prev => prev.some(x => x.id === sent.id) ? prev : [...prev, sentWithRole]);
      setError('');
    } catch (err) { setText(body); setError(`Message not sent: ${(err as Error).message}`); }
  };

  const startWith = async (id: string) => {
    if (!id) return;
    try { const convId = await ensureChatConversation(id); await loadThreads(); setActiveId(convId); }
    catch (err) { setError((err as Error).message); }
  };

  const unread = (t: ChatThread) => asStudent ? t.unread_count_student : t.unread_count_counselor;
  const avatar = (name: string) => (name[0] || 'A').toUpperCase();

  return (
    <div className="h-[calc(100vh-140px)] flex border border-slate-200/80 rounded-2xl bg-white shadow-xs overflow-hidden text-left">
      <div className="w-80 border-r border-slate-100 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 space-y-3">
          <h2 className="text-sm font-black text-slate-900">{asStudent ? 'Support & Advisory Chat' : 'Student Support Chat'}</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chat threads..."
              className="w-full h-9 pl-8 pr-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#58051E]/40" />
          </div>
          {!asStudent && (
            <select aria-label="Start a chat with a student" value="" onChange={e => startWith(e.target.value)}
              className="w-full h-9 px-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
              <option value="">+ Start a chat with a student…</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <BlockCap />
          ) : visible.length === 0 ? (
            <div className="p-6 text-center text-xs font-bold text-slate-400">No active chat threads.</div>
          ) : visible.map(t => {
            const title = titleOf(t);
            return (
              <div key={t.id} onClick={() => setActiveId(t.id)}
                className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${activeId === t.id ? 'bg-[#58051E]/5 border-l-4 border-l-[#58051E]' : 'hover:bg-slate-50'}`}>
                <div className="w-9 h-9 rounded-xl bg-[#58051E] text-white flex items-center justify-center text-xs font-black shrink-0">{avatar(title)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="text-xs font-black text-slate-900 truncate">{title}</h4>
                    <span className="text-[9.5px] font-semibold text-slate-400">{t.last_message ? clock(t.last_message_at) : ''}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-slate-500 truncate">{t.last_message || 'No messages yet'}</p>
                    {unread(t) > 0 && <span className="text-[9px] font-black bg-[#58051E] text-white rounded-full px-1.5 py-0.5">{unread(t)}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/40">
        {error && <div role="alert" className="px-6 py-2 bg-rose-50 border-b border-rose-200 text-xs font-bold text-rose-800">{error}</div>}
        {active ? (
          <>
            <div className="px-6 py-3.5 bg-white border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#58051E] text-white flex items-center justify-center text-xs font-black">{avatar(titleOf(active))}</div>
              <div>
                <h3 className="text-xs font-black text-slate-900">{titleOf(active)}</h3>
                <p className="text-[10px] font-semibold text-slate-400">{asStudent ? 'Education Support Advisor' : 'Student Candidate'}</p>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-y-auto space-y-3.5">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-xs font-bold text-slate-400">
                  {asStudent ? 'No messages yet. Ask your advisor a question below!' : 'No messages exchanged yet in this conversation.'}
                </div>
              ) : messages.map(m => {
                const senderProfile = usersMap[m.sender_id];
                // Retrieve actual sender role from authenticated user's profile or database record
                const rawSenderRole = (
                  (m.sender_id === user?.id ? (profile?.role || user?.user_metadata?.role) : '') ||
                  senderProfile?.role ||
                  m.sender_role ||
                  ''
                ).toLowerCase().trim();

                // Explicit role classification: Student, Counselor, or Admin
                let roleLabel: 'Student' | 'Counselor' | 'Admin';
                if (rawSenderRole === 'student') {
                  roleLabel = 'Student';
                } else if (rawSenderRole === 'counselor' || rawSenderRole === 'staff') {
                  roleLabel = 'Counselor';
                } else {
                  roleLabel = 'Admin';
                }

                // Determine sender actual name
                let senderName = '';
                if (m.sender_id === user?.id) {
                  senderName =
                    profile?.full_name ||
                    user?.user_metadata?.full_name ||
                    user?.email?.split('@')[0] ||
                    roleLabel;
                } else {
                  senderName =
                    senderProfile?.name ||
                    names[m.sender_id] ||
                    roleLabel;
                }

                // Keep student messages left-aligned, counselor and admin messages right-aligned in staff view
                const isStudent = roleLabel === 'Student';
                const alignRight = asStudent ? m.sender_id === user?.id : !isStudent;

                return (
                  <div key={m.id} className={`flex ${alignRight ? 'justify-end' : 'justify-start'}`}>
                    <div className={`min-w-[190px] max-w-[70%] p-3.5 rounded-2xl text-xs leading-relaxed font-semibold shadow-xs ${alignRight ? 'bg-[#58051E] text-white rounded-br-xs' : 'bg-white border border-slate-200/80 text-slate-800 rounded-bl-xs'}`}>
                      {/* Sender Name, Role Label & Timestamp */}
                      <div className={`flex items-center justify-between gap-3 pb-1 mb-1.5 border-b text-[11px] ${alignRight ? 'border-white/15' : 'border-slate-100'}`}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`font-extrabold truncate ${alignRight ? 'text-white' : 'text-slate-900'}`}>
                            {senderName}
                          </span>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${alignRight ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200/60'}`}>
                            {roleLabel}
                          </span>
                        </div>
                        <span className={`text-[9.5px] font-semibold shrink-0 ${alignRight ? 'text-white/70' : 'text-slate-400'}`}>
                          {clock(m.sent_at)}
                        </span>
                      </div>

                      {/* Message Content */}
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
            <form onSubmit={send} className="p-4 bg-white border-t border-slate-100 flex items-center gap-3">
              <input value={text} onChange={e => setText(e.target.value)} aria-label="Message"
                placeholder={asStudent ? 'Type your message to your counselor...' : 'Type your reply here...'}
                className="flex-1 h-10 px-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#58051E]/40" />
              <button type="submit" className="h-10 px-5 bg-[#58051E] text-white rounded-xl text-xs font-bold hover:bg-[#430316] transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer">
                Send <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs font-bold text-slate-400">
            {asStudent ? 'Opening your advisory chat…' : 'Select a student chat thread, or start one from the list.'}
          </div>
        )}
      </div>
    </div>
  );
}
