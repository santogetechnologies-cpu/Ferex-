import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette, CheckCircle2, Eye, Download, X, ExternalLink,
  Square, Type, MousePointer, ZoomIn, Layers, Layout
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const DigitalUIUX: React.FC = () => {
  const [toast, setToast] = useState('');
  const [activeTool, setActiveTool] = useState<'select' | 'frame' | 'vector' | 'text'>('select');
  const [selectedLayer, setSelectedLayer] = useState('Hero Header Component');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showPrototype, setShowPrototype] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  return (
    <div className="space-y-6 text-left antialiased select-none">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Palette className="w-5 h-5 text-[#6A1B2E]" /> Interactive Figma Artboard & Design Studio
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Figma design tokens, artboard canvas inspector, component tree, and interactive prototype viewer.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-xs font-bold" onClick={() => setShowPrototype(true)}>
            <Eye className="w-3.5 h-3.5 mr-1.5" /> Launch Prototype Viewer
          </Button>
          <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => showToast('Figma Tokens exported to JSON!')}>
            <Download className="w-4 h-4 mr-1.5" /> Export Figma Tokens
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Tokenized UI Components', value: '520 Components', sub: 'Buttons, Modals, Inputs', color: 'text-[#6A1B2E]' },
          { label: 'Usability Score Rating', value: '95.2 / 100', sub: '12 Sprint User Audits', color: 'text-emerald-700' },
          { label: 'Figma Canvas Artboards', value: '24 Artboards', sub: 'Desktop, Tablet & Mobile', color: 'text-purple-700' },
          { label: 'Design System Tokens', value: '64 Tokens', sub: 'Color, Spacing, Font', color: 'text-blue-700' },
        ].map((card, idx) => (
          <Card key={idx} className="p-4 border border-slate-200/70 shadow-xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">{card.label}</span>
            <div className={`text-xl font-black ${card.color}`}>{card.value}</div>
            <div className="text-[10px] font-semibold text-slate-400 mt-1">{card.sub}</div>
          </Card>
        ))}
      </div>

      {/* SIGNATURE VISUAL FEATURE: Interactive Figma-style Canvas & Studio Editor */}
      <Card className="p-0 border border-slate-300 rounded-3xl shadow-xl overflow-hidden bg-slate-900">
        {/* Figma Editor Top Toolbar */}
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-white">
          {/* Tools Selector */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700">
            {[
              { id: 'select', label: 'Select (V)', icon: MousePointer },
              { id: 'frame', label: 'Frame (F)', icon: Layout },
              { id: 'vector', label: 'Vector (R)', icon: Square },
              { id: 'text', label: 'Text (T)', icon: Type },
            ].map(tool => {
              const IconComp = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => { setActiveTool(tool.id as any); showToast(`Selected tool: ${tool.label}`); }}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${activeTool === tool.id ? 'bg-[#6A1B2E] text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                  title={tool.label}
                >
                  <IconComp className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>

          <span className="font-mono text-[11px] text-slate-300 font-bold hidden sm:inline">Tata Motors Design System v3.fig</span>

          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="text-slate-400 font-mono">Zoom: {zoomLevel}%</span>
            <button onClick={() => setZoomLevel(prev => prev === 150 ? 100 : prev + 25)} className="p-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg border border-slate-700">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Studio Canvas Area: Layer Tree Sidebar + Artboard Preview */}
        <div className="grid grid-cols-1 md:grid-cols-4 min-h-[380px]">
          {/* Left Layer Tree Sidebar */}
          <div className="p-4 bg-slate-950 border-r border-slate-800 text-left text-xs font-semibold space-y-3">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#6A1B2E]" /> Layers Tree
            </span>
            <div className="space-y-1">
              {[
                'Hero Header Component',
                'Navigation Bar (Sticky)',
                'Primary CTA Button (Tokenized)',
                'Product Cards Grid',
                'Footer Copyright Frame',
              ].map(layer => (
                <div
                  key={layer}
                  onClick={() => setSelectedLayer(layer)}
                  className={`p-2 rounded-lg cursor-pointer transition-all ${selectedLayer === layer ? 'bg-[#6A1B2E] text-white font-bold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
                >
                  • {layer}
                </div>
              ))}
            </div>
          </div>

          {/* Right Artboard Interactive Canvas */}
          <div className="md:col-span-3 p-8 bg-slate-900 flex items-center justify-center relative overflow-hidden">
            {/* Grid Dots Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:16px_16px]" />

            {/* Artboard Frame Box */}
            <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl p-6 text-slate-900 space-y-4 border-2 border-[#6A1B2E] relative z-10 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[10px] font-black uppercase text-[#6A1B2E] bg-[#6A1B2E]/10 px-2 py-0.5 rounded">Artboard: Desktop Frame</span>
                <span className="text-[10px] font-mono text-slate-400">1440 x 1024 px</span>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Selected Layer Specs:</span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 space-y-1">
                  <p>Layer: <span className="font-bold text-[#6A1B2E]">{selectedLayer}</span></p>
                  <p>Fill Token: var(--color-maroon-primary)</p>
                  <p>Border Radius: 16px</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Prototype Viewer Drawer */}
      <AnimatePresence>
        {showPrototype && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setShowPrototype(false)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">Interactive Framer Prototype</h3>
                <button onClick={() => setShowPrototype(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs font-semibold">
                <p>Prototype Link: https://framer.com/ferex-design-system</p>
                <p>Usability Pass Rate: <span className="font-black text-emerald-600">95.2%</span></p>
              </div>
              <Button size="sm" className="w-full bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => { showToast('Opening Framer Prototype Workspace...'); setShowPrototype(false); }}>
                Open Live Framer Prototype <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
