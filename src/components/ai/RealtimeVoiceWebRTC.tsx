/**
 * Ferex Enterprise — OpenAI Realtime API Voice Session (WebRTC)
 *
 * Architecture identical to ChatGPT Voice Mode:
 *  • RTCPeerConnection → OpenAI Realtime API (gpt-4o-realtime-preview)
 *  • Mic audio streamed directly to OpenAI — no STT roundtrip
 *  • AI audio response arrives as WebRTC remote track — zero TTS latency
 *  • Server-VAD handles barge-in: AI stops the moment user speaks
 *  • Data channel provides real-time transcripts & events
 *  • Language auto-detected by the model — no manual selection needed
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, PhoneOff, Volume2, VolumeX,
  RefreshCw, AlertCircle, Wifi, Globe,
} from 'lucide-react';
import { getSystemConfig, getEffectiveOpenAIApiKey } from '../../lib/api/systemConfig';
import { getRealtimeSystemPrompt, type UserRoleType } from '../../lib/api/aiRealtimeService';
import { AIVoiceVisualizer } from './AIVoiceVisualizer';
import type { LiveStudentContext } from '../../lib/api/openrouterChat';

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionState = 'idle' | 'connecting' | 'active' | 'error';

interface TranscriptLine {
  id: string;
  speaker: 'user' | 'ai';
  text: string;
  done: boolean;
}

export interface RealtimeVoiceWebRTCProps {
  role?: UserRoleType;
  userId?: string;
  userEmail?: string;
  studentContext?: LiveStudentContext;
  /** Callback when a full exchange completes — used to sync with chat history */
  onExchangeComplete?: (userText: string, aiText: string) => void;
  onEndSession?: () => void;
}

// ─── Normalise model name ─────────────────────────────────────────────────────

function resolveRealtimeModel(raw?: string): string {
  if (!raw || !raw.trim()) return 'gpt-realtime-2.1-mini';
  return raw.trim();
}

// ─── Phone icon (inline to avoid import issues) ───────────────────────────────
const PhoneIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.41 2 2 0 0 1 3.07 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

export const RealtimeVoiceWebRTC: React.FC<RealtimeVoiceWebRTCProps> = ({
  role = 'central_admin',
  userId,
  userEmail,
  onExchangeComplete,
  onEndSession,
}) => {
  // ── State ─────────────────────────────────────────────────────────────────
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);
  const [connectedModel, setConnectedModel] = useState('');

  // ── Refs ──────────────────────────────────────────────────────────────────
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const micTrackRef = useRef<MediaStreamTrack | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const lastUserTranscriptRef = useRef('');
  const lastAiTranscriptRef = useRef('');
  const isMountedRef = useRef(true);
  const sessionStateRef = useRef<SessionState>('idle');

  useEffect(() => {
    sessionStateRef.current = sessionState;
  }, [sessionState]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // ── Scroll transcript to bottom ───────────────────────────────────────────
  const scrollTranscript = useCallback(() => {
    setTimeout(() => {
      transcriptScrollRef.current?.scrollTo({ top: 99999, behavior: 'smooth' });
    }, 50);
  }, []);

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback((silent = false) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    if (micTrackRef.current) {
      micTrackRef.current.stop();
      micTrackRef.current = null;
    }
    if (dcRef.current) {
      try { dcRef.current.close(); } catch {}
      dcRef.current = null;
    }
    if (pcRef.current) {
      try { pcRef.current.close(); } catch {}
      pcRef.current = null;
    }
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
      audioElRef.current.remove();
      audioElRef.current = null;
    }

    if (!silent && isMountedRef.current) {
      setSessionState('idle');
      sessionStateRef.current = 'idle';
      setIsUserSpeaking(false);
      setIsAiSpeaking(false);
      setAudioLevel(0);
    }
  }, []);

  // ── Realtime event handler ────────────────────────────────────────────────
  const handleEvent = useCallback((ev: any) => {
    if (!isMountedRef.current) return;

    switch (ev.type) {
      case 'session.created':
      case 'session.updated':
        if (ev.session?.model) setConnectedModel(ev.session.model);
        break;

      case 'input_audio_buffer.speech_started':
        setIsUserSpeaking(true);
        setTranscripts(prev => {
          const filtered = prev.filter(t => !(t.speaker === 'user' && !t.done));
          return [...filtered, { id: `u-${Date.now()}`, speaker: 'user', text: '…', done: false }];
        });
        break;

      case 'input_audio_buffer.speech_stopped':
        setIsUserSpeaking(false);
        break;

      case 'conversation.item.input_audio_transcription.completed': {
        const txt = (ev.transcript || '').trim();
        if (!txt) break;
        lastUserTranscriptRef.current = txt;
        setTranscripts(prev => {
          const copy = [...prev];
          const idx = [...copy].reverse().findIndex(t => t.speaker === 'user');
          if (idx !== -1) {
            const ri = copy.length - 1 - idx;
            copy[ri] = { ...copy[ri], text: txt, done: true };
          } else {
            copy.push({ id: `u-${Date.now()}`, speaker: 'user', text: txt, done: true });
          }
          return copy;
        });
        scrollTranscript();
        break;
      }

      case 'response.audio_transcript.delta': {
        const delta = ev.delta || '';
        if (!delta) break;
        setIsAiSpeaking(true);
        setTranscripts(prev => {
          const copy = [...prev];
          const lastIdx = [...copy].reverse().findIndex(t => t.speaker === 'ai' && !t.done);
          if (lastIdx !== -1) {
            const ri = copy.length - 1 - lastIdx;
            copy[ri] = { ...copy[ri], text: copy[ri].text + delta };
          } else {
            copy.push({ id: `ai-${Date.now()}`, speaker: 'ai', text: delta, done: false });
          }
          return copy;
        });
        scrollTranscript();
        break;
      }

      case 'response.audio_transcript.done': {
        const full = (ev.transcript || '').trim();
        lastAiTranscriptRef.current = full;
        setTranscripts(prev =>
          prev.map(t => t.speaker === 'ai' && !t.done ? { ...t, text: full || t.text, done: true } : t)
        );
        break;
      }

      case 'response.done':
        setIsAiSpeaking(false);
        if (lastUserTranscriptRef.current && lastAiTranscriptRef.current) {
          onExchangeComplete?.(lastUserTranscriptRef.current, lastAiTranscriptRef.current);
        }
        lastUserTranscriptRef.current = '';
        lastAiTranscriptRef.current = '';
        break;

      case 'response.cancelled':
        setIsAiSpeaking(false);
        setTranscripts(prev =>
          prev.map(t => t.speaker === 'ai' && !t.done ? { ...t, done: true } : t)
        );
        break;

      case 'error':
        console.error('[Realtime] Server error:', ev.error);
        if (ev.error?.code === 'session_expired') {
          setError('Session expired. Please reconnect.');
          disconnect();
          setSessionState('error');
          sessionStateRef.current = 'error';
        }
        break;

      default:
        break;
    }
  }, [disconnect, onExchangeComplete, scrollTranscript]);

  // ── Remote audio visualiser ───────────────────────────────────────────────
  const startVisualiser = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;
      const src = ctx.createMediaStreamSource(stream);
      src.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current || !isMountedRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(Math.min(1, avg / 72));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch { /* visualiser is optional */ }
  }, []);

  // ── Connect ───────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (!isMountedRef.current) return;
    setSessionState('connecting');
    sessionStateRef.current = 'connecting';
    setError('');
    setTranscripts([]);
    setConnectedModel('');

    try {
      setStatusMsg('Loading API configuration…');
      const config = await getSystemConfig();
      const apiKey = getEffectiveOpenAIApiKey(config);

      if (!apiKey) {
        throw new Error(
          'No OpenAI API key found. Go to Settings → AI Studio and add your OpenAI key.'
        );
      }

      const model = resolveRealtimeModel(config?.ai_config?.openai_model);
      const voice = config?.ai_config?.realtime_voice || 'alloy';

      // Parallel: get ephemeral token + build enterprise system prompt
      setStatusMsg('Authenticating with OpenAI & loading enterprise data…');
      const [tokenRes, systemPrompt] = await Promise.all([
        fetch('https://api.openai.com/v1/realtime/client_secrets', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session: {
              type: 'realtime',
              model,
            },
          }),
        }),
        getRealtimeSystemPrompt(role, userId, userEmail),
      ]);

      if (!tokenRes.ok) {
        const errBody = await tokenRes.json().catch(() => ({}));
        throw new Error(
          errBody?.error?.message ||
          `OpenAI Realtime access denied (HTTP ${tokenRes.status}). ` +
          `Your API key must have Realtime API access (paid tier).`
        );
      }

      const tokenData = await tokenRes.json();
      const ephemeralKey: string = tokenData?.value || tokenData?.client_secret?.value || tokenData?.key;
      if (!ephemeralKey) {
        throw new Error('OpenAI did not return a valid client secret token.');
      }

      if (!isMountedRef.current) return;
      setStatusMsg('Creating WebRTC peer connection…');

      // RTCPeerConnection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Remote audio element
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioEl.style.cssText = 'position:fixed;width:0;height:0;opacity:0;pointer-events:none';
      document.body.appendChild(audioEl);
      audioElRef.current = audioEl;

      pc.ontrack = (e) => {
        if (!isMountedRef.current) return;
        audioEl.srcObject = e.streams[0];
        startVisualiser(e.streams[0]);
      };

      // Microphone
      setStatusMsg('Requesting microphone access…');
      let ms: MediaStream;
      try {
        ms = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 24000,
          },
        });
      } catch (micErr: any) {
        if (micErr?.name === 'NotAllowedError' || micErr?.name === 'PermissionDeniedError' || micErr?.message?.includes('Permission denied')) {
          throw new Error('Microphone permission denied. Please allow microphone access in your browser address bar / site settings.');
        }
        if (micErr?.name === 'NotFoundError' || micErr?.name === 'DevicesNotFoundError') {
          throw new Error('No microphone device found on your computer. Please connect a microphone.');
        }
        throw new Error(`Microphone access error: ${micErr?.message || 'Unable to access microphone'}`);
      }

      const micTrack = ms.getTracks()[0];
      micTrackRef.current = micTrack;
      pc.addTrack(micTrack, ms);

      // Data channel
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onopen = () => {
        if (!isMountedRef.current) return;

        // Send full session update with enterprise system prompt + voice
        dc.send(JSON.stringify({
          type: 'session.update',
          session: {
            instructions: systemPrompt,
            voice,
            modalities: ['audio', 'text'],
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: {
              type: 'server_vad',
              threshold: config?.ai_config?.vad_threshold ?? 0.5,
              prefix_padding_ms: config?.ai_config?.vad_prefix_padding_ms ?? 300,
              silence_duration_ms: config?.ai_config?.vad_silence_duration_ms ?? 500,
            },
          },
        }));

        setSessionState('active');
        sessionStateRef.current = 'active';
        setConnectedModel(model);
        setStatusMsg('Connected');
      };

      dc.onmessage = (e) => {
        try { handleEvent(JSON.parse(e.data)); } catch {}
      };

      dc.onerror = (e) => console.error('[Realtime] DataChannel error:', e);

      // SDP offer
      setStatusMsg('Negotiating codec with OpenAI…');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Brief wait for ICE candidates
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') { resolve(); return; }
        const onStateChange = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', onStateChange);
            resolve();
          }
        };
        pc.addEventListener('icegatheringstatechange', onStateChange);
        setTimeout(resolve, 2000); // safety
      });

      const sdpRes = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        body: pc.localDescription!.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpRes.ok) {
        const errDetail = await sdpRes.text().catch(() => '');
        throw new Error(`SDP exchange failed (HTTP ${sdpRes.status}): ${errDetail || 'Please retry.'}`);
      }

      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

    } catch (err: any) {
      if (!isMountedRef.current) return;
      const msg = err?.message || 'Failed to connect to OpenAI Realtime API';
      console.error('[Realtime]', err);
      setError(msg);
      setSessionState('error');
      sessionStateRef.current = 'error';
      disconnect(true);
    }
  }, [role, userId, userEmail, handleEvent, startVisualiser, disconnect]);

  // ── Mute toggle ───────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!micTrackRef.current) return;
    const next = !isMuted;
    micTrackRef.current.enabled = !next;
    setIsMuted(next);
  }, [isMuted]);

  // ── End session ───────────────────────────────────────────────────────────
  const endSession = useCallback(() => {
    disconnect();
    setTranscripts([]);
    onEndSession?.();
  }, [disconnect, onEndSession]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      disconnect(true);
    };
  }, []); // eslint-disable-line

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  if (sessionState === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-8 px-4 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-2xl shadow-emerald-900/50 mb-4">
            <PhoneIcon className="w-9 h-9 text-white" />
          </div>
          <h3 className="text-white font-bold text-base mb-1">Realtime Voice Call</h3>
          <p className="text-white/55 text-xs max-w-[220px] leading-relaxed mx-auto">
            Powered by OpenAI Realtime WebRTC. Speak any language — AI responds instantly.
          </p>
        </motion.div>

        <div className="flex flex-col items-start gap-2 w-full max-w-[220px] text-[11px] text-white/50">
          <span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-emerald-400" />Auto language detection</span>
          <span className="flex items-center gap-2"><Mic className="w-3.5 h-3.5 text-emerald-400" />Interrupt anytime — barge-in supported</span>
          <span className="flex items-center gap-2"><Wifi className="w-3.5 h-3.5 text-emerald-400" />WebRTC — sub-100ms latency</span>
        </div>

        <button
          onClick={connect}
          className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm shadow-xl transition-all active:scale-95 cursor-pointer"
        >
          Start Voice Session
        </button>
      </div>
    );
  }

  if (sessionState === 'connecting') {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-10 px-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 rounded-full border-4 border-white/20 border-t-emerald-400"
        />
        <div className="text-center">
          <p className="text-white font-bold text-sm">Connecting to OpenAI Realtime…</p>
          <p className="text-white/55 text-xs mt-1 animate-pulse">{statusMsg}</p>
        </div>
      </div>
    );
  }

  if (sessionState === 'error') {
    const isMicError = error.toLowerCase().includes('microphone') || error.toLowerCase().includes('device');
    const isKeyError = error.toLowerCase().includes('openai') || error.toLowerCase().includes('access denied') || error.toLowerCase().includes('api key');

    return (
      <div className="flex flex-col items-center justify-center gap-4 py-6 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-400/30 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <p className="text-white font-bold text-sm mb-1">Connection Failed</p>
          <p className="text-red-300/90 text-xs leading-relaxed max-w-[260px]">{error}</p>
        </div>

        {isMicError && (
          <div className="w-full max-w-[270px] p-3 rounded-xl bg-amber-500/10 border border-amber-400/20 text-[11px] text-amber-200/90 text-left">
            <p className="font-semibold text-amber-300 mb-1">How to fix in Opera / Chrome:</p>
            <ol className="list-decimal pl-4 space-y-1 text-amber-200/80">
              <li>Click the <strong>Lock / Settings icon 🔒</strong> in your browser address bar (top left).</li>
              <li>Toggle <strong>Microphone</strong> to <strong>Allow</strong>.</li>
              <li>Click <strong>Retry Connection</strong> below.</li>
            </ol>
          </div>
        )}

        {isKeyError && (
          <div className="w-full max-w-[270px] p-3 rounded-xl bg-amber-500/10 border border-amber-400/20 text-[11px] text-amber-200/90 text-left">
            <p className="font-semibold text-amber-300 mb-1">OpenAI API Key Checklist:</p>
            <ul className="list-disc pl-4 space-y-1 text-amber-200/80">
              <li>Ensure your account has a paid credit balance.</li>
              <li>Ensure the key has <strong>Realtime API</strong> model permissions.</li>
              <li>Check key in <strong>Central Settings → AI Studio</strong>.</li>
            </ul>
          </div>
        )}

        <button
          onClick={connect}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer mt-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Connection
        </button>
      </div>
    );
  }

  // ACTIVE
  return (
    <div className="flex flex-col items-center gap-3 w-full h-full px-3 py-3 overflow-hidden">

      {/* Status bar */}
      <div className="w-full flex items-center justify-between px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/15 text-[11px] shrink-0">
        <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </div>
        <span className="text-white/80 font-mono text-[10.5px] truncate max-w-[200px]" title={connectedModel || 'gpt-realtime-2.1-mini'}>
          {connectedModel || 'gpt-realtime-2.1-mini'}
        </span>
        <div className="flex items-center gap-1 text-emerald-300/80">
          <Wifi className="w-3 h-3" />
          <span>WebRTC</span>
        </div>
      </div>

      {/* Visualiser */}
      <div className="shrink-0 w-full">
        <AIVoiceVisualizer
          isListening={isUserSpeaking}
          isSpeaking={isAiSpeaking}
          audioLevel={isAiSpeaking ? audioLevel : (isUserSpeaking ? 0.7 : 0)}
          className="w-full max-w-xs mx-auto"
        />
      </div>

      {/* State label */}
      <AnimatePresence mode="wait">
        {isAiSpeaking ? (
          <motion.div key="ai" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-amber-300 text-xs font-bold shrink-0">
            <Volume2 className="w-4 h-4 animate-pulse" /> Ferex AI is speaking…
          </motion.div>
        ) : isUserSpeaking ? (
          <motion.div key="user" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-emerald-300 text-xs font-bold shrink-0">
            <Mic className="w-4 h-4 animate-bounce" /> Listening…
          </motion.div>
        ) : (
          <motion.div key="idle" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="text-white/45 text-xs shrink-0">
            Speak anytime — in any language
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript scroll area */}
      <div
        ref={transcriptScrollRef}
        className="flex-1 w-full overflow-y-auto space-y-2 px-1 scrollbar-none min-h-0"
      >
        <AnimatePresence initial={false}>
          {transcripts.map((line) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${line.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-3 py-2 rounded-2xl text-[11px] leading-relaxed font-medium ${
                  line.speaker === 'user'
                    ? 'bg-white/15 text-white rounded-br-sm'
                    : 'bg-emerald-900/40 text-emerald-100 border border-emerald-500/25 rounded-bl-sm'
                } ${!line.done ? 'opacity-75 italic' : ''}`}
              >
                {line.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {transcripts.length === 0 && (
          <p className="text-center text-white/30 text-[11px] pt-4 italic">
            Transcripts will appear here as you speak
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="w-full flex items-center justify-center gap-5 pb-1 shrink-0">
        <button
          onClick={toggleMute}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          className={`p-3 rounded-full border-2 transition-all cursor-pointer ${
            isMuted
              ? 'bg-rose-500/25 border-rose-400 text-rose-300'
              : 'bg-white/10 border-white/25 text-white hover:bg-white/20'
          }`}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          onClick={endSession}
          title="End voice session"
          className="p-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-2xl border-2 border-rose-400/50 transition-all cursor-pointer active:scale-95"
        >
          <PhoneOff className="w-6 h-6" />
        </button>

        <button
          title={isAiSpeaking ? 'AI is speaking through your speakers' : 'Speaker output'}
          className="p-3 rounded-full bg-white/10 border-2 border-white/25 text-white/60 cursor-default"
        >
          {isAiSpeaking
            ? <Volume2 className="w-5 h-5 text-amber-400 animate-pulse" />
            : <VolumeX className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

export default RealtimeVoiceWebRTC;
