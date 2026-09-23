import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, X, RotateCcw, Maximize2, Minimize2,
  Copy, Check, User, ShieldCheck, RefreshCw,
  Mic, Volume2, VolumeX, MessageSquare,
  Bot, ChevronRight, Sparkles
} from 'lucide-react';
import { Logo } from './Logo';
import { AIVoiceVisualizer } from './ai/AIVoiceVisualizer';
import {
  streamEnterpriseChat,
  detectLanguage,
  speakTextWithLanguage,
  type UserRoleType,
} from '../lib/api/aiRealtimeService';
import { useAuth } from '../contexts/AuthContext';
import { getSystemConfig, getEffectiveOpenAIApiKey } from '../lib/api/systemConfig';
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

  // Voice Interaction States
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [selectedVoiceLang, setSelectedVoiceLang] = useState('auto');

  // Audio / Speech Recognition Refs
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);
  const silenceTimerRef = useRef<any>(null);
  const pendingTranscriptRef = useRef('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const storageKey = `ferex_ai_copilot_${role}_${user?.id || 'guest'}`;

  const VOICE_LANG_OPTIONS = [
    { code: 'auto', label: 'Auto (Global / All Languages)' },
    { code: 'ml-IN', label: 'Malayalam (മലയാളം)' },
    { code: 'ta-IN', label: 'Tamil (தமிழ்)' },
    { code: 'hi-IN', label: 'Hindi (हिन्दी)' },
    { code: 'en-IN', label: 'English (India)' },
    { code: 'en-US', label: 'English (US)' },
    { code: 'pl-PL', label: 'Polish (Polski)' },
    { code: 'ar-SA', label: 'Arabic (العربية)' },
  ];

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

  // ── Speech & Web Audio Setup for Realtime Voice ──
  const startVoiceCapture = async () => {
    try {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(1, avg / 128));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      // Initialize Browser SpeechRecognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch {}
        }

        const recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = selectedVoiceLang === 'auto' ? 'en-IN' : selectedVoiceLang;

        recog.onresult = (event: any) => {
          // Ignore microphone inputs while the assistant is speaking to avoid feedback loop
          if (isSpeakingRef.current) return;

          let interim = '';
          let final = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          const currentText = (final || interim).trim();
          if (currentText) {
            setVoiceTranscript(currentText);
            pendingTranscriptRef.current = currentText;

            // Clear any active silence timer
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

            // VAD silence auto-dispatch: if user pauses for 1100ms or speech is finalized, trigger response
            const delay = final ? 400 : 1100;
            silenceTimerRef.current = setTimeout(() => {
              if (pendingTranscriptRef.current && !isSpeakingRef.current && !isLoading) {
                const queryToSend = pendingTranscriptRef.current;
                pendingTranscriptRef.current = '';
                handleVoiceUserMessage(queryToSend);
              }
            }, delay);
          }
        };

        recog.onerror = (err: any) => {
          console.warn('SpeechRecognition notice:', err);
        };

        recog.onend = () => {
          // Auto restart safely if still in voice mode and not unmounted
          setTimeout(() => {
            if (activeMode === 'voice' && isOpen && !isSpeakingRef.current) {
              try { recog.start(); } catch {}
            }
          }, 250);
        };

        recog.start();
        recognitionRef.current = recog;
        setIsListening(true);
      }
    } catch (err) {
      console.warn('Microphone access unavailable or denied:', err);
    }
  };

  const stopVoiceCapture = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    pendingTranscriptRef.current = '';
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsListening(false);
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    setAudioLevel(0);
  };

  useEffect(() => {
    if (activeMode === 'voice' && isOpen) {
      startVoiceCapture();
    } else {
      stopVoiceCapture();
    }
    return () => {
      stopVoiceCapture();
    };
  }, [activeMode, isOpen, selectedVoiceLang]);

  // Send message from voice input
  const handleVoiceUserMessage = async (transcript: string) => {
    if (!transcript.trim() || isLoading) return;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    pendingTranscriptRef.current = '';
    await handleSendMessage(transcript, true);
  };

  // Main Send Message Handler
  const handleSendMessage = async (textToSend?: string, isFromVoice = false) => {
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
      const config = await getSystemConfig();
      const openAIKey = getEffectiveOpenAIApiKey(config);
      const voiceTimber = config?.ai_config?.realtime_voice || 'alloy';

      const fullResponse = await streamEnterpriseChat({
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
          if (activeMode === 'chat') scrollToBottom();
        },
      });

      // If in Voice Mode or Triggered from Voice, speak response back naturally
      if (activeMode === 'voice' || isFromVoice) {
        if (!isMuted && fullResponse) {
          setIsSpeaking(true);
          isSpeakingRef.current = true;
          await speakTextWithLanguage(
            fullResponse,
            openAIKey,
            voiceTimber,
            () => {
              setIsSpeaking(true);
              isSpeakingRef.current = true;
            },
            () => {
              setIsSpeaking(false);
              isSpeakingRef.current = false;
              setVoiceTranscript('');
              // Resume listening after speech output
              setTimeout(() => {
                if (activeMode === 'voice' && isOpen) {
                  try { recognitionRef.current?.start(); } catch {}
                }
              }, 200);
            }
          );
        }
      }
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

      {/* ── DOCKED SIDEBAR COPILOT DRAWER (Sliding in from Right / Docked beside dashboard) ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className={`fixed top-0 right-0 bottom-0 h-screen bg-white z-50 shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-hidden select-none transition-all duration-300 ${
              isExpanded ? 'w-full sm:w-[680px] lg:w-[740px]' : 'w-full sm:w-[420px] lg:w-[460px]'
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

            {/* ── MODE 1: REALTIME VOICE VIEW WITH 10 WHITE SOUNDWAVE BARS & CAP ── */}
            {activeMode === 'voice' ? (
              <div className="flex-1 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-[#180108] via-[#2A020E] to-[#120005] text-white relative overflow-hidden">
                {/* Spoken Language Selector Bar */}
                <div className="w-full flex items-center justify-between gap-2 z-10 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-xs">
                  <span className="text-[11px] font-bold text-white/80 shrink-0">Voice Language:</span>
                  <select
                    value={selectedVoiceLang}
                    onChange={(e) => setSelectedVoiceLang(e.target.value)}
                    className="bg-black/40 text-white border border-white/20 rounded-lg px-2 py-1 text-[11px] font-bold focus:outline-none focus:border-[#E6CA9E] cursor-pointer"
                  >
                    {VOICE_LANG_OPTIONS.map((lang) => (
                      <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Voice Visualizer with Centered White Graduation Cap & 10 White Sound Bars */}
                <div className="w-full flex-1 flex items-center justify-center my-auto">
                  <AIVoiceVisualizer
                    isListening={isListening}
                    isSpeaking={isSpeaking}
                    audioLevel={audioLevel}
                    className="w-full max-w-sm"
                  />
                </div>

                {/* Live Speech Subtitles / Transcript */}
                <div className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 text-center z-10 min-h-[64px] flex flex-col items-center justify-center mb-2 shadow-lg">
                  {voiceTranscript ? (
                    <div className="w-full flex items-center justify-between gap-2">
                      <p className="text-xs text-white font-semibold line-clamp-2 text-left flex-1">
                        "{voiceTranscript}"
                      </p>
                      <button
                        onClick={() => {
                          if (voiceTranscript.trim() && !isLoading) {
                            handleVoiceUserMessage(voiceTranscript.trim());
                          }
                        }}
                        disabled={isLoading}
                        className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-all shadow-md"
                        title="Send Spoken Message"
                      >
                        <Send className="w-3 h-3" /> Send
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-white/70 italic flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      Listening to your voice... Speak anytime
                    </p>
                  )}

                  {isSpeaking && (
                    <span className="text-[11px] font-bold text-amber-300 mt-1 flex items-center gap-1.5 animate-pulse">
                      <Volume2 className="w-3.5 h-3.5" /> Speaking response...
                    </span>
                  )}
                  {isLoading && !isSpeaking && (
                    <span className="text-[11px] font-bold text-emerald-300 mt-1 flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Generating answer...
                    </span>
                  )}
                </div>

                {/* Voice Controls Bar */}
                <div className="w-full flex items-center justify-center gap-4 mt-2 z-10">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-3 rounded-full border backdrop-blur-md transition-all cursor-pointer ${
                      isMuted
                        ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                        : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    }`}
                    title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={() => {
                      if (isListening) stopVoiceCapture();
                      else startVoiceCapture();
                    }}
                    className={`p-4 rounded-full shadow-2xl transition-all cursor-pointer border-2 ${
                      isListening
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 border-white text-white scale-110'
                        : 'bg-gradient-to-r from-[#58051E] to-[#800020] border-white/80 text-white hover:scale-105'
                    }`}
                    title={isListening ? 'Stop Listening' : 'Start Listening'}
                  >
                    <Mic className="w-6 h-6" />
                  </button>

                  <button
                    onClick={() => setActiveMode('chat')}
                    className="p-3 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 backdrop-blur-md transition-all cursor-pointer"
                    title="Switch to Text Chat"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </button>
                </div>
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
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default EnterpriseAIChatbot;
