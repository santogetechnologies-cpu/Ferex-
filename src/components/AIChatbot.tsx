import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, X, RotateCcw, Maximize2, Minimize2,
  Copy, Check, User, ShieldCheck, RefreshCw
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
  const [liveContext, setLiveContext] = useState<LiveStudentContext | undefined>(propContext);

  const isStudent = mode === 'student';
  const storageKey = isStudent ? `ferex_ai_chat_student_${user?.id || 'guest'}` : 'ferex_ai_chat_landing_v3';

  // Load real-time live database context for student on mount
  useEffect(() => {
    if (isStudent) {
      fetchLiveStudentContext(user?.id, profile?.email || user?.email).then((ctx) => {
        setLiveContext(ctx);
      });
    }
  }, [isStudent, user?.id, profile?.email, user?.email]);

  // Initial professional welcome message (no emojis)
  const welcomeMessage: ChatMessage = {
    role: 'assistant',
    content: isStudent
      ? `Welcome ${liveContext?.studentName || profile?.full_name || 'Student'}.\n\nI am **Ferex AI**, your official European higher education and visa advisor. I have access to your application records for **${liveContext?.targetUniversity || 'European Universities'}**.\n\nI can assist you with:\n- Current milestone status and subsequent procedures\n- Schengen National D-Visa interview preparation\n- Document legalization, Apostille, and certified sworn translations\n- Statement of Purpose (SOP) and academic document compliance\n\nHow may I assist you today?`
      : `Welcome to **Ferex European Education**.\n\nI am **Ferex AI**, your official admissions advisor. I can assist you with:\n- Partner universities and English-taught programs across Poland and the European Union\n- Annual tuition fees and living expenses in EUR and INR\n- Eligibility criteria, IELTS waiver guidelines, and Apostille procedures\n- Schengen student visa documentation and work rights\n\nHow may I assist you with your European education plans today?`,
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
    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
  };

  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Clean Markdown-to-HTML parser: strictly strip images and maintain professional layout
  const renderFormattedContent = (rawContent: string) => {
    // Strip markdown images and html img tags completely
    const content = rawContent
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/<img[^>]*>/g, '');

    const lines = content.split('\n');
    return lines.map((line, idx) => {
      let processed = line;

      // Header 3
      if (processed.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-bold text-xs sm:text-sm text-[#570229] mt-2 mb-1 border-b border-[#570229]/10 pb-0.5">
            {processed.replace('### ', '')}
          </h4>
        );
      }
      // Header 2
      if (processed.startsWith('## ')) {
        return (
          <h3 key={idx} className="font-bold text-sm text-slate-900 mt-2 mb-1">
            {processed.replace('## ', '')}
          </h3>
        );
      }

      // Bullets
      if (processed.startsWith('- ') || processed.startsWith('* ') || processed.startsWith('• ')) {
        const bulletText = processed.replace(/^[-*•]\s+/, '');
        return (
          <div key={idx} className="flex items-start gap-2 ml-1 my-1 text-xs text-slate-700 font-medium leading-relaxed">
            <span className="text-[#570229] font-bold text-xs shrink-0 mt-0.5">•</span>
            <span className="flex-1">{renderInlineFormatting(bulletText)}</span>
          </div>
        );
      }

      // Numbered items (1. 2. etc.)
      const numMatch = processed.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <div key={idx} className="flex items-start gap-2 ml-1 my-1 text-xs text-slate-700 font-medium leading-relaxed">
            <span className="font-bold text-[#570229] text-xs shrink-0 mt-0.5 bg-[#570229]/10 w-4 h-4 rounded-full flex items-center justify-center text-[10px]">
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
          <strong key={i} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 antialiased font-sans select-none print:hidden">
      {/* ── Floating Launcher Trigger with Ferex AI Icon and "Hi" Bubble ── */}
      <AnimatePresence>
        {!isOpen && (
          <div className="flex flex-col items-end gap-1.5">
            {/* Small "Hi" Chat Bubble Outside */}
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.94 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(true)}
              className="relative bg-white text-slate-800 px-3.5 py-1.5 rounded-2xl shadow-xl border border-slate-200/90 text-xs font-semibold flex items-center gap-2 cursor-pointer hover:shadow-2xl hover:border-[#570229]/40 transition-all select-none group"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-bold text-[#570229]">Hi!</span>
              <span className="text-slate-600 font-medium">Chat with Ferex AI</span>

              {/* Chat bubble pointer arrow pointing down towards Ferex AI icon */}
              <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white border-r border-b border-slate-200/90 rotate-45" />
            </motion.div>

            {/* Launcher Button: Made entirely out of Ferex AI Icon */}
            <motion.button
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsOpen(true)}
              className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-[#570229] via-[#6f0335] to-[#800A2E] text-white shadow-2xl hover:shadow-[#570229]/50 border-2 border-white cursor-pointer transition-all duration-300"
              aria-label="Ferex AI"
              title="Ferex AI"
            >
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1.5 shadow-inner transition-transform duration-300 group-hover:scale-105">
                <Logo variant="icon" size="sm" color="#570229" />
              </div>

              {/* Live indicator dot */}
              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-xs" />
            </motion.button>

            {/* In front outer: keep just Ferex AI */}
            <div className="text-center pr-1 select-none">
              <span className="text-[11px] font-bold text-slate-700 bg-white/95 px-2.5 py-0.5 rounded-full shadow-xs border border-slate-200/80">
                Ferex AI
              </span>
            </div>
          </div>
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
            {/* ── Header Bar ── */}
            <div className="bg-gradient-to-r from-[#570229] via-[#6f0335] to-[#800A2E] text-white p-4 flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white p-1.5 flex items-center justify-center shadow-sm shrink-0">
                  <Logo variant="icon" size="sm" color="#570229" />
                </div>

                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white">
                    Ferex AI
                  </h3>
                  <p className="text-[10px] text-white/80 font-medium flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>European Admissions & Student Advisory</span>
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
              <div className="bg-[#570229]/5 border-b border-[#570229]/15 px-4 py-2 flex items-center justify-between text-[11px] font-medium text-slate-700 shrink-0">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-[#570229]" />
                  <span className="text-slate-900 font-bold truncate">{liveContext.studentName || 'Student'}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-[#570229] truncate">{liveContext.targetUniversity || 'European Universities'}</span>
                </div>
                <div className="text-[10px] font-bold text-white bg-[#570229] px-2 py-0.5 rounded-full shrink-0">
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
                          ? 'bg-gradient-to-r from-[#570229] to-[#780a37] text-white rounded-br-xs font-medium'
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
                              <span className="w-2 h-2 rounded-full bg-[#570229] animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 rounded-full bg-[#570229] animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 rounded-full bg-[#570229] animate-bounce" style={{ animationDelay: '300ms' }} />
                              <span className="ml-1 text-[11px] text-[#570229]">Formulating response...</span>
                            </div>
                          )}

                          {msg.content && !isLoading && (
                            <div className="pt-1.5 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleCopyMessage(msg.content, index)}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
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
                      ? 'Type your query regarding documents, visa, or admissions...'
                      : 'Type your query regarding universities, tuition fees, or admissions...'
                  }
                  disabled={isLoading}
                  className="flex-1 h-11 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#570229] disabled:opacity-50 transition-all"
                />

                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="w-11 h-11 rounded-2xl bg-[#570229] hover:bg-[#6F0335] text-white flex items-center justify-center transition-all cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed shrink-0 active:scale-95"
                  aria-label="Send message"
                  title="Send message"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium px-1 mt-2">
                <span className="flex items-center gap-1 text-[#570229] font-semibold">
                  <ShieldCheck className="w-3 h-3" /> Ferex Official AI Advisory
                </span>
                <span>Confidential & Direct</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIChatbot;
