import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, X, RotateCcw, Maximize2, Minimize2,
  Copy, Check, User, Sparkles, MessageSquare,
  Lightbulb, ShieldCheck, ChevronRight, RefreshCw, Zap
} from 'lucide-react';
import { Logo } from './Logo';
import {
  streamOpenRouterChat,
  fetchLiveStudentContext,
  DEFAULT_MODEL,
  type ChatMessage,
  type LiveStudentContext
} from '../lib/api/openrouterChat';
import { useAuth } from '../contexts/AuthContext';

interface AIChatbotProps {
  mode?: 'landing' | 'student';
  studentContext?: LiveStudentContext;
  initialOpen?: boolean;
}

export const AIChatbot: React.FC<AIChatbotProps> = ({
  mode = 'landing',
  studentContext: propContext,
  initialOpen = false,
}) => {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [reasoningTokens, setReasoningTokens] = useState<number | null>(null);
  const [liveContext, setLiveContext] = useState<LiveStudentContext | undefined>(propContext);

  const isStudent = mode === 'student';
  const storageKey = isStudent ? `ferex_ai_chat_student_${user?.id || 'guest'}` : 'ferex_ai_chat_landing_v2';

  // Load real-time live database context for student on mount
  useEffect(() => {
    if (isStudent) {
      fetchLiveStudentContext(user?.id, profile?.email || user?.email).then((ctx) => {
        setLiveContext(ctx);
      });
    }
  }, [isStudent, user?.id, profile?.email, user?.email]);

  // Initial welcome message
  const welcomeMessage: ChatMessage = {
    role: 'assistant',
    content: isStudent
      ? `👋 Welcome **${liveContext?.studentName || profile?.full_name || 'Student'}**!\n\nI am your **Ferex Student Copilot** with live access to your application file for **${liveContext?.targetUniversity || 'European Universities'}**.\n\nI can assist you with:\n- 📋 Real-time milestone status & next steps\n- 🛂 Mock Schengen National D-Visa interview prep\n- 📑 Apostille & Polish Sworn Translation requirements\n- ✍️ Statement of Purpose (SOP) & Motivation Letter reviews\n\nHow can I help with your European journey today?`
      : `👋 Welcome to **Ferex European Education**! 🎓\n\nI am your **AI Admissions Consultant** with direct access to our European university admissions catalog. Ask me anything about:\n- 🇵🇱 Top English-taught Universities in Poland & Europe\n- 💶 Tuition Fees (~€2,000 to €4,500/yr) in EUR & INR\n- 🛂 98.4% Visa Success Rates & MEA Apostille Guidance\n- 💼 20 hrs/week Work Rights & 15-Month Post-Study TRC\n\nHow can I help you choose the right university?`,
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [welcomeMessage];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  // Persist conversation
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {}
  }, [messages, storageKey]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);

    const assistantIndex = updatedMessages.length;
    const assistantPlaceholder: ChatMessage = { role: 'assistant', content: '' };
    setMessages([...updatedMessages, assistantPlaceholder]);

    try {
      await streamOpenRouterChat({
        messages: updatedMessages,
        mode,
        studentData: liveContext,
        model: DEFAULT_MODEL,
        onChunk: (chunkText) => {
          setMessages((prev) => {
            const copy = [...prev];
            if (copy[assistantIndex]) {
              copy[assistantIndex] = {
                ...copy[assistantIndex],
                content: copy[assistantIndex].content + chunkText,
              };
            }
            return copy;
          });
          scrollToBottom();
        },
        onReasoningTokens: (tokens) => {
          setReasoningTokens(tokens);
        },
      });
    } catch (err) {
      console.error('Chat streaming failed:', err);
      setMessages((prev) => {
        const copy = [...prev];
        if (copy[assistantIndex] && !copy[assistantIndex].content) {
          copy[assistantIndex] = {
            role: 'assistant',
            content: `I encountered a temporary connection glitch. Please feel free to ask again or reach out to your Ferex admissions counselor.`,
          };
        }
        return copy;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([welcomeMessage]);
    setReasoningTokens(null);
    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
  };

  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const quickSuggestions = isStudent
    ? [
        '📋 What are my immediate next steps?',
        '🛂 Practice Mock Visa Interview Questions',
        '📑 Review My Required Document Checklist',
        '✍️ Help me write my Statement of Purpose (SOP)',
        '📞 How do I book a meeting with my Counselor?',
      ]
    : [
        '🇵🇱 Study in Poland Benefits & Costs',
        '💶 University Tuition Fees in INR & EUR',
        '🛂 Schengen Visa Requirements & Success Rate',
        '💼 Part-Time Work Rights & 15-Month TRC',
        '📋 English IELTS Waiver Guidelines',
      ];

  // Clean Markdown-to-HTML parser for formatting bullet points, bolding, headings
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      let processed = line;

      // Header 3
      if (processed.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-black text-xs sm:text-sm text-[#570229] mt-2 mb-1 border-b border-[#570229]/10 pb-0.5">
            {processed.replace('### ', '')}
          </h4>
        );
      }
      // Header 2
      if (processed.startsWith('## ')) {
        return (
          <h3 key={idx} className="font-black text-sm text-slate-900 mt-2 mb-1">
            {processed.replace('## ', '')}
          </h3>
        );
      }

      // Bullets
      if (processed.startsWith('- ') || processed.startsWith('* ') || processed.startsWith('• ')) {
        const bulletText = processed.replace(/^[-*•]\s+/, '');
        return (
          <div key={idx} className="flex items-start gap-2 ml-1 my-1 text-xs text-slate-700 font-medium leading-relaxed">
            <span className="text-[#570229] font-black text-xs shrink-0 mt-0.5">•</span>
            <span className="flex-1">{renderInlineFormatting(bulletText)}</span>
          </div>
        );
      }

      // Numbered items (1. 2. etc.)
      const numMatch = processed.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <div key={idx} className="flex items-start gap-2 ml-1 my-1 text-xs text-slate-700 font-medium leading-relaxed">
            <span className="font-black text-[#570229] text-xs shrink-0 mt-0.5 bg-[#570229]/10 w-4 h-4 rounded-full flex items-center justify-center text-[10px]">
              {numMatch[1]}
            </span>
            <span className="flex-1">{renderInlineFormatting(numMatch[2])}</span>
          </div>
        );
      }

      if (!processed.trim()) {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p key={idx} className="text-xs text-slate-800 leading-relaxed font-medium my-0.5">
          {renderInlineFormatting(processed)}
        </p>
      );
    });
  };

  const renderInlineFormatting = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-black text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 antialiased font-sans select-none print:hidden">
      {/* ── Floating Launcher Trigger with Official Ferex Logo ── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-3 bg-gradient-to-r from-[#570229] via-[#6f0335] to-[#800A2E] text-white pl-3.5 pr-5 py-3 rounded-full shadow-2xl hover:shadow-[#570229]/40 border-2 border-white/25 cursor-pointer transition-all duration-300"
            aria-label="Open Ferex AI Assistant"
          >
            {/* Ferex Logo Mark */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-white text-[#570229] flex items-center justify-center shadow-md group-hover:rotate-6 transition-transform duration-300 overflow-hidden p-1">
                <Logo variant="icon" size="sm" color="#570229" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-[#570229] rounded-full animate-pulse" />
            </div>

            {/* Label and Live Status */}
            <div className="text-left">
              <div className="text-xs font-black tracking-wide flex items-center gap-1.5 text-white">
                <span>{isStudent ? 'Ferex Student Copilot' : 'Ferex AI Admissions'}</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <div className="text-[10px] text-amber-200 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{isStudent ? '24/7 Live Visa Advisor' : 'Real-time Study Abroad AI'}</span>
              </div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat Modal Window ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className={`flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden transition-all duration-300 ${
              isExpanded
                ? 'w-[95vw] sm:w-[680px] h-[86vh] fixed bottom-4 right-4 sm:bottom-6 sm:right-6'
                : 'w-[92vw] sm:w-[440px] h-[590px] max-h-[86vh]'
            }`}
          >
            {/* ── Header Bar with Official Ferex Logo ── */}
            <div className="bg-gradient-to-r from-[#570229] via-[#6f0335] to-[#800A2E] text-white p-4 flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white p-1.5 flex items-center justify-center shadow-sm shrink-0">
                  <Logo variant="icon" size="sm" color="#570229" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black tracking-tight text-white">
                      {isStudent ? 'Ferex Student Copilot' : 'Ferex AI Admissions Desk'}
                    </h3>
                    <span className="text-[9px] font-black uppercase tracking-wider bg-white/20 text-white px-1.5 py-0.5 rounded-md border border-white/20">
                      LIVE AI
                    </span>
                  </div>
                  <p className="text-[10px] text-white/80 font-semibold flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>European Higher Education Advisory</span>
                    {reasoningTokens !== null && (
                      <span className="text-[9px] bg-white/10 px-1.5 py-0.2 rounded font-mono text-amber-200">
                        ⚡ {reasoningTokens} tokens
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleClearChat}
                  title="Reset conversation"
                  className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? 'Collapse size' : 'Expand window'}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-all cursor-pointer hidden sm:block"
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  title="Close chat"
                  className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Student Live File Context Banner (in student mode) ── */}
            {isStudent && liveContext && (
              <div className="bg-[#570229]/5 border-b border-[#570229]/15 px-4 py-2 flex items-center justify-between text-[11px] font-bold text-slate-700 shrink-0">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-[#570229]" />
                  <span className="text-slate-900 font-black truncate">{liveContext.studentName || 'Student'}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-[#570229] truncate">{liveContext.targetUniversity || 'European Universities'}</span>
                </div>
                <div className="text-[10px] font-black text-white bg-[#570229] px-2 py-0.5 rounded-full shrink-0 shadow-2xs">
                  Step {liveContext.currentStep || 3}/12
                </div>
              </div>
            )}

            {/* ── Messages Stream ── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAF8F9] text-left">
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
                        <Logo variant="icon" size="xs" color="#570229" />
                      </div>
                    )}

                    <div
                      className={`relative group max-w-[85%] sm:max-w-[80%] rounded-2xl p-3.5 text-xs shadow-xs ${
                        isUser
                          ? 'bg-gradient-to-r from-[#570229] to-[#780a37] text-white rounded-br-xs font-semibold'
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
                            <div className="flex items-center gap-2 py-1 text-slate-400 font-bold text-xs">
                              <span className="w-2 h-2 rounded-full bg-[#570229] animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 rounded-full bg-[#570229] animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 rounded-full bg-[#570229] animate-bounce" style={{ animationDelay: '300ms' }} />
                              <span className="ml-1 text-[11px] text-[#570229]">Analyzing admissions database...</span>
                            </div>
                          )}

                          {msg.content && !isLoading && (
                            <div className="pt-1.5 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleCopyMessage(msg.content, index)}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Copy response"
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

            {/* ── Quick Prompt Chips Carousel ── */}
            <div className="bg-white border-t border-slate-100 p-2.5 overflow-x-auto no-scrollbar shrink-0">
              <div className="flex items-center gap-2 w-max">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1 flex items-center gap-1 shrink-0">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Quick Topics:
                </span>
                {quickSuggestions.map((prompt, idx) => (
                  <button
                    key={idx}
                    disabled={isLoading}
                    onClick={() => handleSendMessage(prompt)}
                    className="text-[11px] font-bold text-slate-700 bg-slate-50 hover:bg-[#570229] hover:text-white px-3 py-1.5 rounded-xl border border-slate-200/80 transition-all cursor-pointer whitespace-nowrap shadow-2xs disabled:opacity-50 active:scale-98"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Input Box ── */}
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
                  placeholder={
                    isStudent
                      ? 'Ask about visa appointment, documents, SOP, next steps...'
                      : 'Ask about universities, tuition fees, eligibility, visas...'
                  }
                  disabled={isLoading}
                  className="flex-1 h-11 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#570229] disabled:opacity-50 transition-all"
                />

                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="w-11 h-11 rounded-2xl bg-[#570229] hover:bg-[#6F0335] text-white flex items-center justify-center transition-all cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed shrink-0 active:scale-95"
                  title="Send message"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>

              <div className="flex items-center justify-between text-[9.5px] text-slate-400 font-semibold px-1 mt-2">
                <span className="flex items-center gap-1 text-[#570229]">
                  <ShieldCheck className="w-3 h-3" /> Ferex Direct University Partner AI
                </span>
                <span>Real-time Admissions Intelligence</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIChatbot;
