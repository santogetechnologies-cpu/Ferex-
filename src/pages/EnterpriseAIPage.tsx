import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, RotateCcw, Copy, Check, User, ShieldCheck, RefreshCw,
  Mic, MessageSquare, Sparkles, Bot, GraduationCap, Globe,
  Snowflake, Monitor, Layers, ArrowRight, Zap, Info, ChevronRight
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { RealtimeVoiceWebRTC } from '../components/ai/RealtimeVoiceWebRTC';
import {
  streamEnterpriseChat,
  type UserRoleType,
} from '../lib/api/aiRealtimeService';
import { useAuth } from '../contexts/AuthContext';
import type { LiveStudentContext } from '../lib/api/openrouterChat';

interface EnterpriseAIPageProps {
  role?: UserRoleType;
  portalName?: string;
  studentContext?: LiveStudentContext;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const EnterpriseAIPage: React.FC<EnterpriseAIPageProps> = ({
  role = 'central_admin',
  portalName = 'Enterprise HQ',
  studentContext,
}) => {
  const { user, profile } = useAuth();
  const [activeMode, setActiveMode] = useState<'chat' | 'voice'>('chat');
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const storageKey = `ferex_ai_copilot_fullpage_${role}_${user?.id || 'admin'}`;

  // Role details & Welcome text
  const getRoleWelcome = (): string => {
    let name = profile?.full_name || user?.email?.split('@')[0] || 'Administrator';
    if (name.toUpperCase() === 'CENTRAL ADMIN' && role !== 'central_admin') {
      const roleNameMap: Record<UserRoleType, string> = {
        trade_admin: 'Global Trade Lead',
        education_admin: 'Education Admissions Lead',
        rimi_admin: 'Rimi FMCG Lead',
        digital_admin: 'Digital Agency Lead',
        digital_pm: 'Digital Project Manager',
        central_admin: 'Central Super Admin',
        student: 'Student',
        guest: 'Guest',
      };
      name = roleNameMap[role] || 'Administrator';
    }

    switch (role) {
      case 'central_admin':
        return `Welcome **${name}** (Central Super Admin HQ).\n\nI am your **Ferex Enterprise Copilot**. I have live access across the entire Ferex ecosystem:\n- **Ferex Education**: Universities, applications, visa telemetry\n- **Global Trade ERP**: Shipments, manifests, customs invoices\n- **Rimi Frozen FMCG**: Cold chain warehouses, stock & logistics\n- **Ferex Digital Agency**: Software projects, client accounts & sprint milestones\n\nHow may I assist your enterprise operations today?`;
      case 'education_admin':
        return `Welcome **${name}** (Ferex Education Lead).\n\nI can assist with university applications, NAWA legalizations, Schengen D-Visa readiness, student documents, and admissions queries.`;
      case 'digital_admin':
      case 'digital_pm':
        return `Welcome **${name}** (Digital Agency Lead).\n\nI can query active tech sprints, client tasks, milestones, deliverables, and system logs across Ferex Digital.`;
      case 'rimi_admin':
        return `Welcome **${name}** (Rimi Frozen FMCG Lead).\n\nI can assist with cold storage inventory, warehouse distributions, temperature monitoring, and logistics orders.`;
      case 'trade_admin':
        return `Welcome **${name}** (Global Trade Lead).\n\nI can assist with global shipment manifests, container tracking, customs documentation, and commercial invoices.`;
      default:
        return `Welcome to **Ferex Enterprise AI**. How can I assist you today?`;
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [{ role: 'assistant', content: getRoleWelcome() }];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeMode === 'chat') {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [messages, activeMode]);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {}
  }, [messages, storageKey]);

  // Quick Action Prompts by Role
  const quickPrompts: Record<UserRoleType, string[]> = {
    central_admin: [
      'Summarize all 4 subsidiaries status',
      'Check university applications & visa pipeline',
      'Show Rimi cold chain inventory health',
      'Digital agency project status',
      'Overview of global trade shipments',
    ],
    education_admin: [
      'Top universities with upcoming intakes',
      'Students requiring Apostille review',
      'Schengen D-Visa interview checklist',
      'Recent student fee verification queue',
    ],
    digital_admin: [
      'Active mobile & web app projects',
      'Team tasks & sprint deadlines',
      'System latency & uptime check',
      'Pending deliverables for clients',
    ],
    digital_pm: [
      'Project milestone breakdown',
      'Pending client deliverables',
    ],
    rimi_admin: [
      'Cold warehouse stock levels',
      'Recent frozen food shipments',
      'Temperature compliance check',
      'Delivery routes & vehicle status',
    ],
    trade_admin: [
      'Active container shipments',
      'Pending customs clearance invoices',
      'Letters of credit verification',
      'Trade CRM partner status',
    ],
    student: [
      'What are the next steps for my visa?',
      'Check my approved documents',
      'How do I book a mock embassy interview?',
    ],
    guest: [
      'Popular universities in Poland',
      'Estimated tuition and living costs',
    ],
  };

  const handleVoiceExchange = (userText: string, aiText: string) => {
    if (!userText || !aiText) return;
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userText },
      { role: 'assistant', content: aiText },
    ]);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInputMessage('');
    setIsLoading(true);

    const assistantIdx = updated.length;
    const placeholder: ChatMessage = { role: 'assistant', content: '' };
    setMessages([...updated, placeholder]);

    try {
      await streamEnterpriseChat({
        messages: updated,
        role,
        userId: user?.id,
        userEmail: profile?.email || user?.email,
        onChunk: (chunk) => {
          setMessages((prev) => {
            const copy = [...prev];
            if (copy[assistantIdx]) {
              copy[assistantIdx] = {
                ...copy[assistantIdx],
                content: copy[assistantIdx].content + chunk,
              };
            }
            return copy;
          });
          scrollToBottom();
        },
      });
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => {
        const copy = [...prev];
        if (copy[assistantIdx] && !copy[assistantIdx].content) {
          copy[assistantIdx] = {
            role: 'assistant',
            content: 'I encountered a brief connection issue. Please feel free to retry your query.',
          };
        }
        return copy;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([{ role: 'assistant', content: getRoleWelcome() }]);
    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
  };

  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const renderFormattedContent = (rawContent: string) => {
    const content = rawContent.replace(/!\[.*?\]\(.*?\)/g, '').replace(/<img[^>]*>/g, '');
    const lines = content.split('\n');

    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-1.5" />;

      if (trimmed.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-bold text-xs sm:text-sm text-[#58051E] mt-2 mb-1 border-b border-[#58051E]/10 pb-0.5">
            {trimmed.replace('### ', '')}
          </h4>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h3 key={idx} className="font-bold text-sm text-slate-900 mt-2 mb-1">
            {trimmed.replace('## ', '')}
          </h3>
        );
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
        const bulletText = trimmed.replace(/^[-*•]\s+/, '');
        return (
          <div key={idx} className="flex items-start gap-2 ml-1 my-1 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
            <span className="text-[#58051E] font-bold text-xs shrink-0 mt-0.5">•</span>
            <span className="flex-1">{renderInlineFormatting(bulletText)}</span>
          </div>
        );
      }
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <div key={idx} className="flex items-start gap-2 ml-1 my-1 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
            <span className="font-bold text-[#58051E] text-xs shrink-0 mt-0.5 bg-[#58051E]/10 w-4 h-4 rounded-full flex items-center justify-center text-[10px]">
              {numMatch[1]}
            </span>
            <span className="flex-1">{renderInlineFormatting(numMatch[2])}</span>
          </div>
        );
      }

      return (
        <p key={idx} className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium my-0.5">
          {renderInlineFormatting(trimmed)}
        </p>
      );
    });
  };

  const renderInlineFormatting = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const getRoleIcon = () => {
    switch (role) {
      case 'education_admin':
        return GraduationCap;
      case 'trade_admin':
        return Globe;
      case 'rimi_admin':
        return Snowflake;
      case 'digital_admin':
        return Monitor;
      default:
        return Sparkles;
    }
  };

  const RoleIcon = getRoleIcon();

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* ── Page Header / Sub-Nav Bar ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#58051E] via-[#6f0335] to-[#800020] text-white flex items-center justify-center shadow-md shadow-[#58051E]/20 shrink-0">
            <RoleIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Enterprise AI Copilot
              </h1>
              <span className="text-[10px] font-extrabold uppercase bg-[#58051E]/10 text-[#58051E] px-2.5 py-0.5 rounded-full border border-[#58051E]/20">
                {portalName}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Enterprise Intelligence • Direct Database Telemetry</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          {/* Mode Switcher: Chat vs Realtime Voice */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80">
            <button
              onClick={() => setActiveMode('chat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMode === 'chat'
                  ? 'bg-white text-[#58051E] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Text Chat</span>
            </button>
            <button
              onClick={() => setActiveMode('voice')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMode === 'voice'
                  ? 'bg-[#58051E] text-white shadow-xs animate-pulse'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Realtime Voice</span>
            </button>
          </div>

          <button
            onClick={handleClearChat}
            title="Clear Chat History"
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* ── Main AI Workstation Card ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col h-[calc(100vh-230px)] min-h-[550px]">
        {activeMode === 'voice' ? (
          /* ── FULL SCREEN VOICE WEBRTC INTERFACE ── */
          <div className="flex-1 flex flex-col bg-gradient-to-b from-[#180108] via-[#2A020E] to-[#120005] text-white p-6 justify-center items-center overflow-hidden">
            <RealtimeVoiceWebRTC
              role={role}
              userId={user?.id}
              userEmail={profile?.email || user?.email}
              studentContext={studentContext}
              onExchangeComplete={handleVoiceExchange}
              onEndSession={() => setActiveMode('chat')}
            />
          </div>
        ) : (
          /* ── FULL SCREEN RICH TEXT CHAT INTERFACE ── */
          <div className="flex-1 flex flex-col overflow-hidden bg-[#FAF8F9]">
            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 text-left">
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`flex gap-3 max-w-4xl mx-auto ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center shrink-0 mt-0.5 p-1">
                        <Logo variant="icon" size="xs" color="#58051E" />
                      </div>
                    )}

                    <div
                      className={`relative group max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 sm:p-4.5 text-xs sm:text-sm shadow-xs ${
                        isUser
                          ? 'bg-gradient-to-r from-[#58051E] to-[#780a37] text-white rounded-br-xs font-medium'
                          : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap leading-relaxed text-white">{msg.content}</p>
                      ) : (
                        <div className="space-y-1.5">
                          {msg.content ? (
                            renderFormattedContent(msg.content)
                          ) : (
                            <div className="flex items-center gap-2 py-1 text-slate-400 font-medium text-xs">
                              <span className="w-2 h-2 rounded-full bg-[#58051E] animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 rounded-full bg-[#58051E] animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 rounded-full bg-[#58051E] animate-bounce" style={{ animationDelay: '300ms' }} />
                              <span className="ml-1 text-xs text-[#58051E] font-semibold">Formulating response...</span>
                            </div>
                          )}

                          {msg.content && !isLoading && (
                            <div className="pt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleCopyMessage(msg.content, index)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-slate-900 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Copy text"
                              >
                                {copiedIndex === index ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" /> Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" /> Copy
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-slate-200 flex items-center justify-center shrink-0 mt-0.5 text-slate-700">
                        <User className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Prompt Badges */}
            <div className="px-4 sm:px-6 py-2.5 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                <Zap className="w-3.5 h-3.5 text-[#58051E]" /> Quick Prompts:
              </div>
              {(quickPrompts[role] || quickPrompts.central_admin).map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={isLoading}
                  className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-[#58051E]/10 hover:text-[#58051E] px-3 py-1.5 rounded-xl transition-colors shrink-0 whitespace-nowrap cursor-pointer border border-slate-200/60"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Bottom Text Chat Input Box */}
            <div className="p-4 sm:p-5 bg-white border-t border-slate-200/80 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="max-w-4xl mx-auto flex items-center gap-2.5"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask anything about enterprise metrics, applications, orders, tasks..."
                  disabled={isLoading}
                  className="flex-1 h-12 px-4.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#58051E] disabled:opacity-50 transition-all shadow-inner"
                />

                <button
                  type="button"
                  onClick={() => setActiveMode('voice')}
                  className="h-12 px-3.5 rounded-2xl bg-slate-100 hover:bg-[#58051E]/10 text-slate-700 hover:text-[#58051E] flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 border border-slate-200/60"
                  title="Switch to Realtime Voice Mode"
                >
                  <Mic className="w-4 h-4 text-[#58051E]" />
                  <span className="hidden sm:inline">Voice</span>
                </button>

                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="h-12 px-5 rounded-2xl bg-[#58051E] hover:bg-[#6F0335] text-white flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed shrink-0 active:scale-95"
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="hidden sm:inline">Thinking...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span className="hidden sm:inline">Send</span>
                    </>
                  )}
                </button>
              </form>

              <div className="max-w-4xl mx-auto flex items-center justify-between text-[11px] text-slate-400 font-medium px-2 mt-2">
                <span className="flex items-center gap-1 text-[#58051E] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" /> Ferex Enterprise AI & Database Integration
                </span>
                <span>Powered by Ferex Multi-Agent Engine</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnterpriseAIPage;
