import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, X, RotateCcw, Maximize2, Minimize2,
  Copy, Check, User, ShieldCheck, RefreshCw,
  Mic, MessageSquare, Sparkles, Bot,
} from 'lucide-react';
import { Logo } from './Logo';
import { RealtimeVoiceWebRTC } from './ai/RealtimeVoiceWebRTC';
import {
  streamEnterpriseChat,
  type UserRoleType,
} from '../lib/api/aiRealtimeService';
import { useAuth } from '../contexts/AuthContext';
import type { LiveStudentContext } from '../lib/api/openrouterChat';

interface EnterpriseAIChatbotProps {
  role?: UserRoleType;
  studentContext?: LiveStudentContext;
  initialOpen?: boolean;
  docked?: boolean;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const EnterpriseAIChatbot: React.FC<EnterpriseAIChatbotProps> = ({
  role = 'central_admin',
  studentContext,
  initialOpen = false,
}) => {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeMode, setActiveMode] = useState<'chat' | 'voice'>('chat');
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const storageKey = `ferex_ai_copilot_${role}_${user?.id || 'guest'}`;

  // Role Badges & Clean Welcome Text (no language enumeration)
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
        return `Welcome **${name}** (Central Super Admin HQ).\n\nI am your **Ferex Enterprise Copilot**. I have live access to the entire Ferex ecosystem:\n- **Ferex Education**: Universities, applications, visa telemetry\n- **Global Trade ERP**: Shipments, manifests, customs invoices\n- **Rimi Frozen FMCG**: Cold chain warehouses, stock & logistics\n- **Ferex Digital Agency**: Software projects, client accounts\n\nHow may I assist your enterprise operations today?`;
      case 'education_admin':
        return `Welcome **${name}** (Ferex Education Lead).\n\nI can assist with university applications, NAWA legalizations, Schengen D-Visa readiness, student documents, and admissions queries.`;
      case 'digital_admin':
      case 'digital_pm':
        return `Welcome **${name}** (Digital Agency Lead).\n\nI can query active tech sprints, client tasks, milestones, and system logs across Ferex Digital.`;
      case 'rimi_admin':
        return `Welcome **${name}** (Rimi Frozen FMCG Lead).\n\nI can assist with cold storage inventory, warehouse distributions, temperature monitoring, and logistics orders.`;
      case 'trade_admin':
        return `Welcome **${name}** (Global Trade Lead).\n\nI can assist with global shipment manifests, container tracking, customs documentation, and commercial invoices.`;
      case 'student':
        return `Welcome **${studentContext?.studentName || name}**.\n\nI am your official **Ferex European Education & Visa Copilot**. I can help you prepare for your university admission, NAWA recognition, MEA Apostille, and Schengen D-Visa interview.`;
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
    if (isOpen && activeMode === 'chat') {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages, activeMode]);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {}
  }, [messages, storageKey]);

  // Listen to custom event to open sidebar from left navigation
  useEffect(() => {
    const handleOpenCopilot = () => setIsOpen(true);
    window.addEventListener('ferex_open_ai_sidebar', handleOpenCopilot);
    return () => window.removeEventListener('ferex_open_ai_sidebar', handleOpenCopilot);
  }, []);

  // Quick Action Prompts by Role
  const quickPrompts: Record<UserRoleType, string[]> = {
    central_admin: [
      'Summarize all 4 subsidiaries status',
      'Check university applications & visa pipeline',
      'Show Rimi cold chain inventory health',
      'Digital agency project status'
    ],
    education_admin: [
      'Top universities with upcoming intakes',
      'Students requiring Apostille review',
      'Schengen D-Visa interview checklist'
    ],
    digital_admin: [
      'Active mobile & web app projects',
      'Team tasks & sprint deadlines',
      'System latency & uptime check'
    ],
    digital_pm: [
      'Project milestone breakdown',
      'Pending client deliverables'
    ],
    rimi_admin: [
      'Cold warehouse stock levels',
      'Recent frozen food shipments',
      'Temperature compliance check'
    ],
    trade_admin: [
      'Active container shipments',
      'Pending customs clearance invoices'
    ],
    student: [
      'What are the next steps for my visa?',
      'Check my approved documents',
      'How do I book a mock embassy interview?'
    ],
    guest: [
      'Popular universities in Poland',
      'Estimated tuition and living costs'
    ]
  };

  // Voice exchange complete — save transcript lines to chat history
  const handleVoiceExchange = (userText: string, aiText: string) => {
    if (!userText || !aiText) return;
    setMessages(prev => [
      ...prev,
      { role: 'user', content: userText },
      { role: 'assistant', content: aiText },
    ]);
  };

  // Main Send Message Handler (text chat only)
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
    try { sessionStorage.removeItem(storageKey); } catch {}
  };

  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Render Clean Formatted Markdown Text
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
          <div key={idx} className="flex items-start gap-2 ml-1 my-1 text-xs text-slate-700 leading-relaxed font-medium">
            <span className="text-[#58051E] font-bold text-xs shrink-0 mt-0.5">•</span>
            <span className="flex-1">{renderInlineFormatting(bulletText)}</span>
          </div>
        );
      }
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <div key={idx} className="flex items-start gap-2 ml-1 my-1 text-xs text-slate-700 leading-relaxed font-medium">
            <span className="font-bold text-[#58051E] text-xs shrink-0 mt-0.5 bg-[#58051E]/10 w-4 h-4 rounded-full flex items-center justify-center text-[10px]">
              {numMatch[1]}
            </span>
            <span className="flex-1">{renderInlineFormatting(numMatch[2])}</span>
          </div>
        );
      }

      return (
        <p key={idx} className="text-xs text-slate-800 leading-relaxed font-medium my-0.5">
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

  return (
    <>
      {/* ── BACKDROP WHEN SIDEBAR IS OPEN ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 transition-opacity"
          />
        )}
      </AnimatePresence>

      {/* ── FLOATING COPILOT POPUP MODAL (Smooth, responsive floating dialog above trigger) ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            style={{ transformOrigin: 'bottom right' }}
            className={`fixed bottom-4 sm:bottom-6 right-3 sm:right-6 bg-white z-50 shadow-2xl rounded-3xl border border-slate-200/90 flex flex-col justify-between overflow-hidden select-none transition-all duration-200 ${
              isExpanded
                ? 'w-[calc(100vw-24px)] sm:w-[680px] lg:w-[740px] h-[88vh] max-h-[750px]'
                : 'w-[calc(100vw-24px)] sm:w-[410px] h-[84vh] sm:h-[600px] max-h-[640px]'
            }`}
          >
            {/* ── Header ── */}
            <div className="bg-gradient-to-r from-[#58051E] via-[#6f0335] to-[#800020] text-white p-3.5 flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8.5 h-8.5 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-xs shrink-0">
                  <Logo variant="icon" size="sm" color="#58051E" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-black tracking-tight text-white uppercase">Ferex AI Copilot</h3>
                    <span className="text-[8.5px] font-black uppercase bg-white/20 px-2 py-0.5 rounded-full text-white/95">
                      {role.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/80 font-medium flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Enterprise Intelligence</span>
                  </p>
                </div>
              </div>

              {/* Mode Toggle & Window Controls */}
              <div className="flex items-center gap-1.5">
                {/* Switch between Chat & Voice */}
                <div className="bg-black/25 p-0.5 rounded-xl flex items-center gap-0.5 border border-white/15">
                  <button
                    onClick={() => setActiveMode('chat')}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      activeMode === 'chat'
                        ? 'bg-white text-[#58051E] shadow-xs'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                    title="Text Chat Mode"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setActiveMode('voice')}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      activeMode === 'voice'
                        ? 'bg-white text-[#58051E] shadow-xs animate-pulse'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                    title="Realtime Voice Mode"
                  >
                    <Mic className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={handleClearChat}
                  title="Reset conversation"
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? 'Collapse' : 'Expand'}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-all cursor-pointer hidden sm:block"
                >
                  {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  title="Close Sidebar"
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── MODE 1: OPENAI REALTIME WEBRTC VOICE (true bidirectional, barge-in, auto language) ── */}
            {activeMode === 'voice' ? (
              <div className="flex-1 flex flex-col bg-gradient-to-b from-[#180108] via-[#2A020E] to-[#120005] text-white overflow-hidden">
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
              /* ── MODE 2: RICH TEXT CHAT VIEW ── */
              <div className="flex-1 flex flex-col overflow-hidden bg-[#FAF8F9]">
                {/* Messages Scroll Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-left">
                  {messages.map((msg, index) => {
                    const isUser = msg.role === 'user';
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isUser && (
                          <div className="w-7 h-7 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center shrink-0 mt-0.5 p-0.5">
                            <Logo variant="icon" size="xs" color="#58051E" />
                          </div>
                        )}

                        <div
                          className={`relative group max-w-[85%] sm:max-w-[80%] rounded-2xl p-3.5 text-xs shadow-xs ${
                            isUser
                              ? 'bg-gradient-to-r from-[#58051E] to-[#780a37] text-white rounded-br-xs font-medium'
                              : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs'
                          }`}
                        >
                          {isUser ? (
                            <p className="whitespace-pre-wrap leading-relaxed text-white">{msg.content}</p>
                          ) : (
                            <div className="space-y-1">
                              {msg.content ? (
                                renderFormattedContent(msg.content)
                              ) : (
                                <div className="flex items-center gap-2 py-1 text-slate-400 font-medium text-xs">
                                  <span className="w-2 h-2 rounded-full bg-[#58051E] animate-bounce" style={{ animationDelay: '0ms' }} />
                                  <span className="w-2 h-2 rounded-full bg-[#58051E] animate-bounce" style={{ animationDelay: '150ms' }} />
                                  <span className="w-2 h-2 rounded-full bg-[#58051E] animate-bounce" style={{ animationDelay: '300ms' }} />
                                  <span className="ml-1 text-[11px] text-[#58051E]">Formulating answer...</span>
                                </div>
                              )}

                              {msg.content && !isLoading && (
                                <div className="pt-1.5 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleCopyMessage(msg.content, index)}
                                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
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
                          <div className="w-7 h-7 rounded-xl bg-slate-200 flex items-center justify-center shrink-0 mt-0.5 text-slate-700">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Action Prompt Badges */}
                <div className="px-3.5 py-1.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
                  {(quickPrompts[role] || quickPrompts.central_admin).map((prompt, pIdx) => (
                    <button
                      key={pIdx}
                      onClick={() => handleSendMessage(prompt)}
                      disabled={isLoading}
                      className="text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-[#58051E]/10 hover:text-[#58051E] px-2.5 py-1 rounded-xl transition-colors shrink-0 whitespace-nowrap cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {/* Text Chat Input Box */}
                <div className="p-3.5 bg-white border-t border-slate-200/80 shrink-0">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Type whatever to get instant answers..."
                      disabled={isLoading}
                      className="flex-1 h-11 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#58051E] disabled:opacity-50 transition-all"
                    />

                    <button
                      type="button"
                      onClick={() => setActiveMode('voice')}
                      className="w-11 h-11 rounded-2xl bg-slate-100 hover:bg-[#58051E]/10 text-slate-700 hover:text-[#58051E] flex items-center justify-center transition-all cursor-pointer shrink-0"
                      title="Switch to Realtime Voice Mode"
                    >
                      <Mic className="w-4 h-4" />
                    </button>

                    <button
                      type="submit"
                      disabled={!inputMessage.trim() || isLoading}
                      className="w-11 h-11 rounded-2xl bg-[#58051E] hover:bg-[#6F0335] text-white flex items-center justify-center transition-all cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed shrink-0 active:scale-95"
                      aria-label="Send"
                      title="Send"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </form>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium px-1 mt-2">
                    <span className="flex items-center gap-1 text-[#58051E] font-semibold">
                      <ShieldCheck className="w-3 h-3" /> Ferex Enterprise AI
                    </span>
                    <span>All Subsidiaries Connected</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FLOATING TRIGGER BUTTON (Round Ferex Icon + Chat Bubble Outside) ── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 360, damping: 24 }}
            className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 flex items-center gap-3 cursor-pointer group select-none"
            onClick={() => setIsOpen(true)}
          >
            {/* Chat Bubble Outside / To the Left */}
            <motion.div
              initial={{ opacity: 0, x: 10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.2 }}
              className="relative hidden xs:flex items-center gap-2 bg-white text-slate-800 text-xs font-bold px-3.5 py-2.5 rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-200/90 hover:border-[#58051E]/40 transition-all cursor-pointer group-hover:scale-105"
            >
              <div className="flex items-center gap-1.5 text-[#58051E]">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span className="font-extrabold text-slate-900">
                  {role === 'student' ? 'AI Student Copilot' : 'Ask Ferex AI'}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-500 hidden sm:inline">
                {role === 'student' ? '• 24/7 Live Answers' : '• Voice & Chat'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />

              {/* Chat Bubble Tail Pointer */}
              <div className="absolute right-[-5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rotate-45 border-t border-r border-slate-200/90" />
            </motion.div>

            {/* Round Simple Ferex Icon Button */}
            <button
              type="button"
              aria-label="Open Ferex AI Assistant"
              className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[#58051E] via-[#6f0335] to-[#800020] text-white shadow-2xl shadow-[#58051E]/40 hover:shadow-[#58051E]/60 border-2 border-white/30 flex items-center justify-center transition-transform duration-200 group-hover:scale-110 active:scale-95 cursor-pointer shrink-0"
            >
              <Logo variant="icon" size="sm" color="#ffffff" />
              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full animate-pulse shadow-xs" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default EnterpriseAIChatbot;
