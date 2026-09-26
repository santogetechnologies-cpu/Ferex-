import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Save, RefreshCw, CheckCircle2, Shield,
  Building, Database, Check, AlertTriangle, Key,
  Zap, Bot, Sparkles, Eye, EyeOff, Mic, Volume2,
  Globe2, Cpu, ArrowRight, HelpCircle
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { getSystemConfig, saveSystemConfig } from '../../lib/api/systemConfig';
import type { SystemCustomizationConfig } from '../../lib/types';
import { ChangePasswordForm } from '../../components/ChangePasswordForm';
import { ToastNotification } from '../../components/ToastNotification';

export const CentralSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ai' | 'branding' | 'database' | 'password'>('ai');
  const [config, setConfig] = useState<SystemCustomizationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [dbLatency, setDbLatency] = useState<number | null>(null);
  const [testingDb, setTestingDb] = useState(false);
  const [testingOpenAI, setTestingOpenAI] = useState(false);
  const [openAITestStatus, setOpenAITestStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [lastSaved, setLastSaved] = useState('');


  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const data = await getSystemConfig();
        setConfig(data);
        if (data.updated_at) {
          setLastSaved(new Date(data.updated_at).toLocaleTimeString());
        }
      } catch {
        showToastMsg('Failed to load system settings.');
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!config) return;
    setSaving(true);
    try {
      const updated = await saveSystemConfig(config);
      setConfig(updated);
      setLastSaved(new Date().toLocaleTimeString());
      showToastMsg('Enterprise AI & System Settings synchronized with Supabase database!');
    } catch {
      showToastMsg('Failed to synchronize settings with database.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestDatabase = async () => {
    setTestingDb(true);
    const start = performance.now();
    try {
      const { error } = await supabase.from('users').select('id', { count: 'exact', head: true });
      const elapsed = Math.round(performance.now() - start);
      if (!error) {
        setDbLatency(elapsed);
        showToastMsg(`Database connection optimal! Ping: ${elapsed}ms`);
      } else {
        setDbLatency(-1);
        showToastMsg(`Database warning: ${error.message}`);
      }
    } catch {
      setDbLatency(-1);
      showToastMsg('Database ping failed. Check network or Supabase credentials.');
    } finally {
      setTestingDb(false);
    }
  };

  const handleTestOpenAI = async () => {
    const key = config?.ai_config?.openai_api_key?.trim();
    if (!key) {
      setOpenAITestStatus({ success: false, message: 'Please enter an OpenAI API key first.' });
      return;
    }
    setTestingOpenAI(true);
    setOpenAITestStatus(null);
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${key}`
        }
      });
      if (res.ok) {
        setOpenAITestStatus({ success: true, message: 'OpenAI API key authenticated successfully!' });
        showToastMsg('OpenAI Realtime API key verified successfully!');
      } else {
        const err = await res.json().catch(() => ({}));
        setOpenAITestStatus({
          success: false,
          message: err?.error?.message || `Authentication failed (Status ${res.status})`
        });
      }
    } catch (err: any) {
      setOpenAITestStatus({ success: false, message: err?.message || 'Connection error to OpenAI' });
    } finally {
      setTestingOpenAI(false);
    }
  };

  const handleSaveOpenAIKey = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const updated = await saveSystemConfig(config);
      setConfig(updated);
      setLastSaved(new Date().toLocaleTimeString());
      showToastMsg('OpenAI Realtime API Key saved & activated successfully!');
    } catch {
      showToastMsg('Failed to save OpenAI API Key.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearOpenAIKey = async () => {
    if (!config) return;
    const updatedConfig = {
      ...config,
      ai_config: { ...config.ai_config, openai_api_key: '' }
    };
    setConfig(updatedConfig);
    await saveSystemConfig(updatedConfig);
    setOpenAITestStatus(null);
    showToastMsg('OpenAI API Key removed.');
  };

  if (loading || !config) {

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-[#58051E] mb-3" />
        <p className="text-sm font-bold">Synchronizing Central HQ Settings...</p>
      </div>
    );
  }

  const aiConfig = config.ai_config || {
    openai_api_key: '',
    openai_model: 'gpt-realtime-2.1-mini',
    realtime_voice: 'alloy',
    transcription_model: 'gpt-realtime-whisper',
    noise_reduction: 'far_field',
    turn_detection_type: 'server_vad',
    vad_threshold: 0.5,
    vad_prefix_padding_ms: 300,
    vad_silence_duration_ms: 500,
    audio_sample_rate: 24000,
    audio_format: 'audio/pcm',
    output_modalities: ['audio', 'text'],
    reasoning_effort: 'medium',
    max_output_tokens: 'inf',
    openrouter_api_key: '',
    openrouter_model: 'google/gemini-2.0-flash-exp:free',
    system_instructions: `Respond to user requests in a conversational, quick, and friendly tone—always providing short, expressive audio replies in the exact language spoken or requested by the user. Accurately recognize the language the user speaks, and ensure your output audio is in the same spoken language. Support all spoken languages that ChatGPT can handle, including (but not limited to) Malayalam, English, Hindi, Bengali, Tamil, Polish, Italian, German, French, and all other languages worldwide. If the user's language is not recognized or supported, reply kindly and ask for another choice. Always clarify which language you are speaking in if the user is unclear, and switch smoothly if the user changes preferences.\n\nIf the user provides unclear input, briefly ask them to clarify or to specify the language they want to use. Always keep your audio output short (a single sentence per turn) and conversational to minimize wait time for the user.`,
    auto_detect_language: true,
    default_language: 'auto',
    enable_realtime_voice: true,
    enable_chat_fallback: true
  };

  const handleResetPromptTemplate = () => {
    setConfig({
      ...config,
      ai_config: {
        ...aiConfig,
        system_instructions: `Respond to user requests in a conversational, quick, and friendly tone—always providing short, expressive audio replies in the exact language spoken or requested by the user. Accurately recognize the language the user speaks, and ensure your output audio is in the same spoken language. Support all spoken languages that ChatGPT can handle, including (but not limited to) Malayalam, English, Hindi, Bengali, Tamil, Polish, Italian, German, French, and all other languages worldwide. If the user's language is not recognized or supported, reply kindly and ask for another choice. Always clarify which language you are speaking in if the user is unclear, and switch smoothly if the user changes preferences.\n\nIf the user provides unclear input, briefly ask them to clarify or to specify the language they want to use. Always keep your audio output short (a single sentence per turn) and conversational to minimize wait time for the user.`
      }
    });
    showToastMsg('Realtime Audio Prompt Template loaded!');
  };

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast Alert */}
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Settings className="w-6 h-6 text-[#58051E]" /> Central Enterprise System Settings
            </h1>
            <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              Live DB Sync
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Configure OpenAI Realtime Audio & Voice intelligence, Server VAD, noise reduction, and multi-language speech.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {lastSaved && (
            <span className="text-[11px] font-bold text-slate-400 bg-white border border-slate-200/80 px-3 py-1.5 rounded-xl">
              Synced: <strong className="text-slate-700">{lastSaved}</strong>
            </span>
          )}
          <Button
            size="sm"
            onClick={() => handleSave()}
            disabled={saving}
            className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold text-white shadow-xs cursor-pointer"
          >
            <Save className={`w-3.5 h-3.5 mr-1.5 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'Syncing to DB...' : 'Save & Sync DB'}
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200/80 overflow-x-auto scrollbar-none shadow-xs">
        {[
          { id: 'ai', label: 'AI Voice & Session Studio', icon: Bot },
          { id: 'branding', label: 'Enterprise Identity & Branding', icon: Building },
          { id: 'database', label: 'Database & System Health', icon: Database },
          { id: 'password', label: 'Super Admin Password', icon: Key },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#58051E] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: AI & Realtime Configuration */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          {/* OpenAI Realtime API Key & Authentication */}
          <Card className="p-6 border border-slate-200/80 shadow-xs bg-white space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#58051E]" />
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    OpenAI Realtime API Credential Configuration
                  </h2>
                  {aiConfig.openai_api_key ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ Saved & Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Key Not Set
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium text-slate-400 mt-0.5">
                  Used for low-latency WebRTC/WebSocket audio streaming (<a href="https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini" target="_blank" rel="noreferrer" className="text-[#58051E] font-bold underline">gpt-realtime-2.1-mini</a>) and client secret creation.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTestOpenAI}
                  disabled={testingOpenAI || !aiConfig.openai_api_key}
                  className="text-xs font-bold border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 cursor-pointer"
                >
                  <Zap className={`w-3.5 h-3.5 mr-1 text-[#58051E] ${testingOpenAI ? 'animate-spin' : ''}`} />
                  {testingOpenAI ? 'Testing Key...' : 'Verify OpenAI Key'}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveOpenAIKey}
                  disabled={saving}
                  className="text-xs font-bold bg-[#58051E] hover:bg-[#430316] text-white cursor-pointer shadow-xs"
                >
                  {saving ? 'Saving...' : 'Save API Key'}
                </Button>
              </div>
            </div>

            {/* Test Status Feedback */}
            {openAITestStatus && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                openAITestStatus.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {openAITestStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{openAITestStatus.message}</span>
              </div>
            )}

            {/* OpenAI API Key with Eye Toggle */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <label className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#58051E]" />
                  OpenAI API Key (Bearer Secret Token)
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400 font-normal">
                    View, test, or update your key anytime
                  </span>
                  {aiConfig.openai_api_key && (
                    <button
                      type="button"
                      onClick={handleClearOpenAIKey}
                      className="text-[11px] text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                    >
                      Remove Key
                    </button>
                  )}
                </div>
              </div>

              <div className="relative flex items-center">
                <input
                  type={showOpenAIKey ? 'text' : 'password'}
                  value={aiConfig.openai_api_key || ''}
                  onChange={(e) => {
                    const newKey = e.target.value.trim();
                    setConfig({
                      ...config,
                      ai_config: { ...aiConfig, openai_api_key: newKey }
                    });
                    try {
                      if (newKey) localStorage.setItem('ferex_openai_api_key', newKey);
                      else localStorage.removeItem('ferex_openai_api_key');
                    } catch {}
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveOpenAIKey();
                    }
                  }}
                  placeholder="Paste your key here: sk-proj-..."
                  className="w-full p-3 pr-24 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E] text-slate-800 transition-all shadow-inner"
                />
                <div className="absolute right-2.5 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg cursor-pointer transition-colors"
                    title={showOpenAIKey ? 'Hide API Key' : 'View API Key'}
                  >
                    {showOpenAIKey ? <EyeOff className="w-4 h-4 text-[#58051E]" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <Button
                    size="sm"
                    onClick={handleSaveOpenAIKey}
                    disabled={saving || !aiConfig.openai_api_key}
                    className="h-7 px-2.5 text-[10px] font-bold bg-[#58051E] hover:bg-[#430316] text-white cursor-pointer shadow-xs rounded-lg"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>

              {/* Status and Key Management Helper */}
              {aiConfig.openai_api_key ? (
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-emerald-900">API Key Configured & Ready: </span>
                      <span className="font-mono text-[11px] text-emerald-700">
                        {aiConfig.openai_api_key.length > 12
                          ? `${aiConfig.openai_api_key.substring(0, 7)}••••••••••••${aiConfig.openai_api_key.slice(-4)}`
                          : '••••••••••••'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowOpenAIKey(true);
                      }}
                      className="text-[11px] font-bold text-[#58051E] hover:underline cursor-pointer"
                    >
                      Edit Key
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleClearOpenAIKey}
                      className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Change / Replace
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800 font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Enter your OpenAI API secret key above and click <strong>Save</strong> to activate low-latency real-time voice & AI streaming.</span>
                </div>
              )}
            </div>
          </Card>


          {/* Realtime Session Parameters (Matching OpenAI Playground) */}
          <Card className="p-6 border border-slate-200/80 shadow-xs bg-white space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#58051E]" />
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Model & Audio Architecture Settings
                </h2>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-0.5">
                Full parameter controls for OpenAI Realtime session creation (`/v1/realtime/client_secrets`).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Realtime Model */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block">Realtime Model</label>
                <input
                  type="text"
                  value={aiConfig.openai_model || 'gpt-realtime-2.1-mini'}
                  onChange={(e) => setConfig({
                    ...config,
                    ai_config: { ...aiConfig, openai_model: e.target.value }
                  })}
                  placeholder="gpt-realtime-2.1-mini"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#58051E]"
                />
                <div className="flex flex-wrap gap-1">
                  {['gpt-realtime-2.1-mini', 'gpt-4o-realtime-preview', 'gpt-4o-mini'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setConfig({
                        ...config,
                        ai_config: { ...aiConfig, openai_model: m }
                      })}
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                        aiConfig.openai_model === m ? 'bg-[#58051E] text-white border-[#58051E]' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* User Transcript Model */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block">User Transcript Model</label>
                <input
                  type="text"
                  value={aiConfig.transcription_model || 'gpt-realtime-whisper'}
                  onChange={(e) => setConfig({
                    ...config,
                    ai_config: { ...aiConfig, transcription_model: e.target.value }
                  })}
                  placeholder="gpt-realtime-whisper"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#58051E]"
                />
                <p className="text-[10px] text-slate-400">Audio input transcription model.</p>
              </div>

              {/* Reasoning Effort */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block">Reasoning Effort</label>
                <select
                  value={aiConfig.reasoning_effort || 'medium'}
                  onChange={(e) => setConfig({
                    ...config,
                    ai_config: { ...aiConfig, reasoning_effort: e.target.value }
                  })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-[#58051E]"
                >
                  <option value="low">Low (Fastest Audio Response)</option>
                  <option value="medium">Medium (Balanced Speed & Reasoning)</option>
                  <option value="high">High (Maximum Reasoning Depth)</option>
                </select>
                <p className="text-[10px] text-slate-400">Controls inference depth per audio turn.</p>
              </div>

              {/* Realtime Spoken Voice */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block">Realtime Spoken Voice</label>
                <select
                  value={aiConfig.realtime_voice || 'alloy'}
                  onChange={(e) => setConfig({
                    ...config,
                    ai_config: { ...aiConfig, realtime_voice: e.target.value }
                  })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-[#58051E]"
                >
                  <option value="alloy">Alloy (Clear & Direct)</option>
                  <option value="verse">Verse (Natural & Expressive)</option>
                  <option value="shimmer">Shimmer (Warm & Academic)</option>
                  <option value="echo">Echo (Crisp & Focused)</option>
                  <option value="coral">Coral (Friendly & Bright)</option>
                  <option value="sage">Sage (Calm & Professional)</option>
                  <option value="ash">Ash (Gentle & Smooth)</option>
                  <option value="ballad">Ballad (Melodic & Soft)</option>
                </select>
                <p className="text-[10px] text-slate-400">Generated audio voice personality.</p>
              </div>

              {/* Noise Reduction */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block">Acoustic Noise Reduction</label>
                <select
                  value={aiConfig.noise_reduction || 'far_field'}
                  onChange={(e) => setConfig({
                    ...config,
                    ai_config: { ...aiConfig, noise_reduction: e.target.value }
                  })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-[#58051E]"
                >
                  <option value="far_field">Far Field (Dynamic Ambient & Echo Cancellation)</option>
                  <option value="near_field">Near Field (Headset / Close Mic)</option>
                  <option value="off">Off (Raw Audio Stream)</option>
                </select>
                <p className="text-[10px] text-slate-400">Filters microphone background noise.</p>
              </div>

              {/* Max Output Tokens */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block">Max Output Tokens</label>
                <input
                  type="text"
                  value={aiConfig.max_output_tokens || 'inf'}
                  onChange={(e) => setConfig({
                    ...config,
                    ai_config: { ...aiConfig, max_output_tokens: e.target.value }
                  })}
                  placeholder="inf (Unlimited)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#58051E]"
                />
                <p className="text-[10px] text-slate-400">Use 'inf' for unlimited conversational length.</p>
              </div>
            </div>

            {/* Turn Detection (Server VAD) Settings */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase">
                    Turn Detection & Server VAD (Voice Activity Detection)
                  </h3>
                  <p className="text-[11px] font-medium text-slate-500">
                    Automatically detects when user stops speaking to deliver instant audio responses.
                  </p>
                </div>
                <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Server VAD Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    VAD Threshold: <span className="text-[#58051E] font-black">{aiConfig.vad_threshold ?? 0.5}</span>
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={aiConfig.vad_threshold ?? 0.5}
                    onChange={(e) => setConfig({
                      ...config,
                      ai_config: { ...aiConfig, vad_threshold: parseFloat(e.target.value) }
                    })}
                    className="w-full accent-[#58051E] cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400">Default: 0.5</span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Prefix Padding: <span className="text-[#58051E] font-black">{aiConfig.vad_prefix_padding_ms ?? 300} ms</span>
                  </label>
                  <input
                    type="number"
                    value={aiConfig.vad_prefix_padding_ms ?? 300}
                    onChange={(e) => setConfig({
                      ...config,
                      ai_config: { ...aiConfig, vad_prefix_padding_ms: parseInt(e.target.value, 10) || 300 }
                    })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400">Audio buffer before speech (ms)</span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Silence Duration: <span className="text-[#58051E] font-black">{aiConfig.vad_silence_duration_ms ?? 500} ms</span>
                  </label>
                  <input
                    type="number"
                    value={aiConfig.vad_silence_duration_ms ?? 500}
                    onChange={(e) => setConfig({
                      ...config,
                      ai_config: { ...aiConfig, vad_silence_duration_ms: parseInt(e.target.value, 10) || 500 }
                    })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400">Silence required to trigger reply (ms)</span>
                </div>
              </div>
            </div>

            {/* Audio Format & Modalities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="font-bold text-slate-800 block mb-0.5">Input & Output Audio Format</span>
                <span className="font-mono font-bold text-xs text-[#58051E] block">audio/pcm @ 24,000 Hz</span>
                <p className="text-[10px] text-slate-400 mt-1">High-fidelity 24kHz PCM mono audio encoding.</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="font-bold text-slate-800 block mb-0.5">Output Modalities</span>
                <span className="font-mono font-bold text-xs text-[#58051E] block">["audio", "text"]</span>
                <p className="text-[10px] text-slate-400 mt-1">Simultaneous natural voice and text transcript stream.</p>
              </div>
            </div>
          </Card>

          {/* System Instructions & Realtime Prompt */}
          <Card className="p-6 border border-slate-200/80 shadow-xs bg-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#58051E]" />
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Realtime Audio Prompt & Multi-Language Instructions
                  </h2>
                </div>
                <p className="text-xs font-medium text-slate-400 mt-0.5">
                  Directs the AI to recognize any language spoken (Malayalam, English, Tamil, Polish, Hindi, etc.) and reply in that language.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleResetPromptTemplate}
                className="text-xs font-bold border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1 text-[#58051E]" />
                Load Realtime Audio Prompt Template
              </Button>
            </div>

            <div>
              <textarea
                rows={7}
                value={aiConfig.system_instructions || ''}
                onChange={(e) => setConfig({
                  ...config,
                  ai_config: { ...aiConfig, system_instructions: e.target.value }
                })}
                placeholder="Realtime audio instructions..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-medium focus:bg-white focus:outline-none focus:border-[#58051E] text-slate-800"
              />
            </div>
          </Card>
        </div>
      )}


      {/* Tab 2: Enterprise Branding */}
      {activeTab === 'branding' && (
        <Card className="p-6 border border-slate-200/80 shadow-xs bg-white space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Enterprise Brand & Organization Identity</h2>
            <p className="text-xs font-medium text-slate-400 mt-0.5">Parameters broadcasted across invoices, notifications, and customer portals.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Organization Legal Name</label>
              <input
                type="text"
                value={config.branding.org_name}
                onChange={(e) => setConfig({ ...config, branding: { ...config.branding, org_name: e.target.value } })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#58051E]"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Master Portal Title</label>
              <input
                type="text"
                value={config.branding.portal_title}
                onChange={(e) => setConfig({ ...config, branding: { ...config.branding, portal_title: e.target.value } })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#58051E]"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Corporate Tagline</label>
              <input
                type="text"
                value={config.branding.tagline}
                onChange={(e) => setConfig({ ...config, branding: { ...config.branding, tagline: e.target.value } })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#58051E]"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Central Support Email</label>
              <input
                type="email"
                value={config.branding.support_email}
                onChange={(e) => setConfig({ ...config, branding: { ...config.branding, support_email: e.target.value } })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#58051E]"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Official Telephone / Helpline</label>
              <input
                type="text"
                value={config.branding.support_phone}
                onChange={(e) => setConfig({ ...config, branding: { ...config.branding, support_phone: e.target.value } })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#58051E]"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">HQ Office Address</label>
              <input
                type="text"
                value={config.branding.office_address}
                onChange={(e) => setConfig({ ...config, branding: { ...config.branding, office_address: e.target.value } })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#58051E]"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Tab 3: Database & System Health */}
      {activeTab === 'database' && (
        <Card className="p-6 border border-slate-200/80 shadow-xs bg-white space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Enterprise Database Connectivity</h2>
              <p className="text-xs font-medium text-slate-400 mt-0.5">Real-time health status and schema synchronization diagnostics.</p>
            </div>
            <Button
              size="sm"
              onClick={handleTestDatabase}
              disabled={testingDb}
              variant="outline"
              className="text-xs font-bold text-slate-700 bg-slate-50 cursor-pointer"
            >
              <Zap className={`w-3.5 h-3.5 mr-1.5 ${testingDb ? 'animate-spin text-[#58051E]' : ''}`} />
              {testingDb ? 'Testing Connection...' : 'Ping Database'}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-700 uppercase block">Database Engine</span>
              <span className="text-sm font-black text-emerald-900 mt-1 block">Supabase PostgreSQL 15</span>
              <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">Active & Synchronized</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Round-Trip Latency</span>
              <span className="text-sm font-black text-slate-900 mt-1 block">
                {dbLatency === null ? 'Click "Ping" to measure' : dbLatency === -1 ? 'Connection Error' : `${dbLatency} ms`}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Direct REST / WebSocket</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Realtime Subscriptions</span>
              <span className="text-sm font-black text-slate-900 mt-1 block">4 Active Channels</span>
              <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Payments, Users, Audit, Emails</span>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 4: Change Super Admin Password */}
      {activeTab === 'password' && (
        <Card className="p-6 border border-slate-200/80 shadow-xs bg-white space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Super Admin Security Credential Update</h2>
            <p className="text-xs font-medium text-slate-400 mt-0.5">Securely change the master administrator login password.</p>
          </div>

          <div className="max-w-md">
            <ChangePasswordForm
              title="Super Admin Password"
              subtitle="Update your master Central HQ authentication password"
              onSuccess={() => showToastMsg('Super Admin password successfully updated!')}
            />
          </div>
        </Card>
      )}
    </div>
  );
};

export default CentralSettings;
