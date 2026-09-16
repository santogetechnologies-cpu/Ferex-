import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Bot, Send, X, RotateCcw, Maximize2, Minimize2,
  Copy, Check, User, ChevronRight, MessageSquare, ShieldCheck,
  GraduationCap, Globe, Compass, Cpu, Zap, Lightbulb
} from 'lucide-react';
import {
  streamOpenRouterChat,
  DEFAULT_MODEL,
  type ChatMessage,
  type StudentContextData
} from '../lib/api/openrouterChat';

interface AIChatbotProps {
  mode?: 'landing' | 'student';
  studentContext?: StudentContextData;
  initialOpen?: boolean;
}

export const AIChatbot: React.FC<AIChatbotProps> = ({
  mode = 'landing',
  studentContext,
  initialOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [reasoningTokens, setReasoningTokens] = useState<number | null>(null);

  const isStudent = mode === 'student';
  const storageKey = isStudent ? 'ferex_ai_chat_student_v1' : 'ferex_ai_chat_landing_v1';

  // Initial welcome message
  const welcomeMessage: ChatMessage = {
    role: 'assistant',
    content: isStudent
      ? `👋 Hello **${studentContext?.studentName || 'Student'}**! I am your **Ferex Student Copilot**.\n\nI can help you prepare for your visa interview, review your document checklist, draft your Statement of Purpose (SOP), or explain European university regulations.\n\nHow can I help you today?`
      : `👋 Hello! Welcome to **Ferex European Education**! 🎓\n\nI am your **AI Admissions Consultant** powered by Gemma 4 26B. Ask me anything about:\n- 🇵🇱 Top English-taught Universities in Poland & Europe\n- 💶 Tuition Fees (~€2,000/yr) & Monthly Living Expenses\n- 🛂 Schengen Student Visa Requirements & 98.4% Success Rate\n- 💼 15-Month Post-Study Work Permits & Part-Time Jobs\n\nHow can I guide your European study journey?`,
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

  // Auto-scroll to bottom
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

    // Placeholder assistant message for streaming
    const assistantIndex = updatedMessages.length;
    const assistantPlaceholder: ChatMessage = { role: 'assistant', content: '' };
    setMessages([...updatedMessages, assistantPlaceholder]);

    try {
      await streamOpenRouterChat({
        messages: updatedMessages,
        mode,
        studentData: studentContext,
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
            content: `I'm sorry, I encountered a temporary connection issue. Please feel free to ask again or reach out to our human admissions desk.`,
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

  // Quick suggestion chips
  const quickSuggestions = isStudent
    ? [
        '📋 What are my next steps?',
        '🛂 Mock Visa Interview Questions',
        '📑 Review Required Documents',
        '✍️ SOP & Motivation Letter Tips',
      ]
    : [
        '🇵🇱 Study in Poland Benefits & Costs',
        '💶 Tuition Fees & Scholarships',
        '🛂 Visa Process & Success Rates',
        '💼 Part-time Work & Stay-back Rights',
      ];

  // Simple Markdown-to-HTML parser for formatting bullet points, bolding, headings
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      let processed = line;

      // Header 3
      if (processed.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-black text-sm text-[#58051E] mt-2 mb-1">
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
      if (processed.startsWith('- ') || processed.startsWith('* ')) {
        const bulletText = processed.substring(2);
        return (
          <div key={idx} className="flex items-start gap-1.5 ml-1 my-0.5 text-xs text-slate-700 font-medium">
            <span className="text-[#58051E] font-bold">•</span>
            <span>{renderInlineFormatting(bulletText)}</span>
          </div>
        );
      }

      // Numbered items (1. 2. etc.)
      const numMatch = processed.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <div key={idx} className="flex items-start gap-1.5 ml-1 my-0.5 text-xs text-slate-700 font-medium">
            <span className="font-bold text-[#58051E] shrink-0">{numMatch[1]}.</span>
            <span>{renderInlineFormatting(numMatch[2])}</span>
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
    // Bold **text**
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
      {/* ── Floating Launcher Trigger ── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-3 bg-gradient-to-r from-[#58051E] via-[#6f0727] to-[#800A2E] text-white px-4 py-3 rounded-full shadow-2xl hover:shadow-[#58051E]/40 border border-white/20 cursor-pointer transition-all duration-300"
            aria-label="Open Ferex AI Assistant"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:rotate-12 transition-transform duration-300">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#58051E] rounded-full animate-pulse" />
            </div>

            <div className="text-left pr-1 hidden sm:block">
              <div className="text-xs font-black tracking-wide flex items-center gap-1">
                <span>{isStudent ? 'Student AI Copilot' : 'Ferex AI Admissions'}</span>
                <Sparkles className="w-3 h-3 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
              </div>
              <div className="text-[10px] text-white/80 font-medium">
                {isStudent ? '24/7 Visa & Study Advisor' : 'Gemma 4 26B AI Assistant'}
              </div>
            </div>

            <span className="sm:hidden text-xs font-black">AI Chat</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat Modal Window ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden transition-all duration-300 ${
              isExpanded
                ? 'w-[95vw] sm:w-[650px] h-[85vh] fixed bottom-4 right-4 sm:bottom-6 sm:right-6'
                : 'w-[92vw] sm:w-[420px] h-[580px] max-h-[85vh]'
            }`}
          >
            {/* ── Header ── */}
            <div className="bg-gradient-to-r from-[#58051E] via-[#6f0727] to-[#800A2E] text-white p-3.5 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-9 h-9 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#58051E] rounded-full" />
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs sm:text-sm font-black tracking-tight">
                      {isStudent ? 'Ferex Student Copilot' : 'Ferex AI Admissions'}
                    </h3>
                    <span className="text-[9.5px] font-bold uppercase tracking-wider bg-white/20 px-1.5 py-0.2 rounded-md border border-white/20">
                      Gemma 4
                    </span>
                  </div>
                  <p className="text-[10px] text-white/80 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>OpenRouter 24/7 AI Desk</span>
                    {reasoningTokens !== null && (
                      <span className="ml-1 text-[9px] bg-white/10 px-1 rounded text-amber-200">
                        ⚡ {reasoningTokens} tokens
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleClearChat}
                  title="Clear conversation"
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? 'Collapse size' : 'Expand window'}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer hidden sm:block"
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  title="Close chat"
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Student Context Banner (if student mode) ── */}
            {isStudent && studentContext?.studentName && (
              <div className="bg-slate-50 border-b border-slate-200/80 px-4 py-2 flex items-center justify-between text-[11px] font-semibold text-slate-600 shrink-0">
                <div className="flex items-center gap-1.5 truncate">
                  <User className="w-3.5 h-3.5 text-[#58051E]" />
                  <span className="font-bold text-slate-900">{studentContext.studentName}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600 truncate">{studentContext.targetCountry || 'Europe'}</span>
                </div>
                <div className="text-[10px] font-black text-[#58051E] bg-[#58051E]/10 px-2 py-0.5 rounded-full shrink-0">
                  Step {studentContext.currentStep || 3}/12
                </div>
              </div>
            )}

            {/* ── Messages Container ── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gradient-to-b from-slate-50/50 to-white text-left">
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-xl bg-[#58051E]/10 border border-[#58051E]/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-4 h-4 text-[#58051E]" />
                      </div>
                    )}

                    <div
                      className={`relative group max-w-[85%] sm:max-w-[80%] rounded-2xl p-3 text-xs shadow-2xs ${
                        isUser
                          ? 'bg-gradient-to-r from-[#58051E] to-[#73092a] text-white rounded-br-xs font-semibold'
                          : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      ) : (
                        <div className="space-y-1">
                          {msg.content ? (
                            renderFormattedContent(msg.content)
                          ) : (
                            <div className="flex items-center gap-1.5 py-1 text-slate-400 font-semibold text-xs">
                              <span className="w-2 h-2 rounded-full bg-[#58051E] animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 rounded-full bg-[#58051E] animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 rounded-full bg-[#58051E] animate-bounce" style={{ animationDelay: '300ms' }} />
                              <span className="ml-1 text-[11px] text-slate-400">Gemma is thinking...</span>
                            </div>
                          )}

                          {msg.content && !isLoading && (
                            <div className="pt-1 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleCopyMessage(msg.content, index)}
                                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
                                title="Copy answer"
                              >
                                {copiedIndex === index ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="w-7 h-7 rounded-xl bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-4 h-4 text-slate-700" />
                      </div>
                    )}
                  </motion.div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Quick Chips Carousel ── */}
            <div className="bg-slate-50 border-t border-slate-200/60 p-2 overflow-x-auto no-scrollbar shrink-0">
              <div className="flex items-center gap-1.5 w-max">
                <span className="text-[10px] font-bold text-slate-400 pl-1 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3 text-amber-500" /> Prompts:
                </span>
                {quickSuggestions.map((prompt, idx) => (
                  <button
                    key={idx}
                    disabled={isLoading}
                    onClick={() => handleSendMessage(prompt)}
                    className="text-[11px] font-bold text-slate-700 bg-white hover:bg-[#58051E] hover:text-white px-2.5 py-1 rounded-xl border border-slate-200 transition-all cursor-pointer whitespace-nowrap shadow-2xs disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Input Box ── */}
            <div className="p-3 bg-white border-t border-slate-200/80 shrink-0">
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
                      ? 'Ask about visa steps, documents, SOP tips...'
                      : 'Ask about European universities, fees, visa...'
                  }
                  disabled={isLoading}
                  className="flex-1 h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E] disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="w-10 h-10 rounded-2xl bg-[#58051E] hover:bg-[#430316] text-white flex items-center justify-center transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              <div className="flex items-center justify-between text-[9.5px] text-slate-400 font-medium px-1 mt-1.5">
                <span>Model: google/gemma-4-26b-a4b-it:free</span>
                <span>Ferex Education AI Desk</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIChatbot;
