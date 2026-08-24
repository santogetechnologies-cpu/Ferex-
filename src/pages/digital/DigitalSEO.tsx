import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search as SearchIcon, CheckCircle2,
  Sparkles, Play, ChevronDown, ChevronUp,
  Loader2, Clock
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

// ── Google SERP Simulator Data ─────────────────────────────────────────────
const paaQuestions = [
  { q: 'Which is the best place to buy smartphones online in India?', a: 'Reliance Digital offers 100% genuine products with official brand warranty, same-day delivery, and festival discounts.' },
  { q: 'How to get instant cashback on electronics?', a: 'Use HDFC Bank, ICICI Bank, or Axis Bank credit cards during checkout for up to ₹10,000 instant cashback.' }
];

// ── Crawler Modal Steps ─────────────────────────────────────────────────────
const crawlerSteps = [
  'Initializing Ahrefs & Search Console Crawler Engine...',
  '✓ Connecting to Google Search Console API',
  '✓ Fetching Sitemap.xml (2,420 URLs Submitted)',
  '✓ Crawling Website Pages & Depth Architecture',
  '✓ Checking Robots.txt Directives & Indexing Rules',
  '✓ Verifying SSL RSA 2048-bit Encryption Certificate',
  '✓ Checking Canonical Tags & 301 Redirect Chains',
  '✓ Validating Schema.org JSON-LD Structured Data',
  '✓ Detecting Broken Links & HTTP 404 Exceptions',
  '✓ Measuring Core Web Vitals (LCP, CLS, INP)',
  '✓ Checking Mobile Responsiveness & Viewport Tags',
  '✓ Auditing Meta Titles & Description Duplicates',
  '✓ Generating AI Score Recommendations',
  '✓ Technical Crawler Scan Completed (100% Passed)'
];

// ── AI Findings Panel Data ─────────────────────────────────────────────────
const initialAiRecommendations = [
  { priority: 'High Priority', impact: '+14 Score Impact', time: '30 mins to fix', title: 'Optimize Largest Contentful Paint (LCP)', desc: 'Preload LCP hero banner image to reduce render delay from 1.2s to 0.8s.', bg: 'bg-red-50 text-red-700 border-red-200' },
  { priority: 'High Priority', impact: '+12 Score Impact', time: '15 mins to fix', title: 'Missing Schema on Product Pages', desc: 'Inject Schema.org Product & Offer JSON-LD to enable Google Price Snippets.', bg: 'bg-red-50 text-red-700 border-red-200' },
  { priority: 'Medium Priority', impact: '+8 Score Impact', time: '20 mins to fix', title: 'Compress 42 Hero Banner Images', desc: 'Convert PNG/JPEG gallery assets to WebP format to save 1.4 MB payload.', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  { priority: 'Medium Priority', impact: '+6 Score Impact', time: '10 mins to fix', title: 'Fix Duplicate Meta Descriptions', desc: '6 category URLs share identical meta tags. Apply tokenized descriptions.', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  { priority: 'Low Priority', impact: '+4 Score Impact', time: '25 mins to fix', title: 'Add Internal Links to Blog Posts', desc: 'Link blog reviews directly to product catalog URLs for pagerank flow.', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  { priority: 'Low Priority', impact: '+4 Score Impact', time: '10 mins to fix', title: 'Improve Mobile CLS Layout Stability', desc: 'Add explicit width and height attributes to promotional banners.', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
];

export const DigitalSEO: React.FC = () => {
  const [toast, setToast] = useState('');
  const [searchQuery, setSearchQuery] = useState('online electronics shopping India');
  const [openPaa, setOpenPaa] = useState<number | null>(0);

  // Live Technical Scan Modal State
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<string>('Never');

  // Dynamic Animated State Post-Scan
  const [healthScore, setHealthScore] = useState(96);
  const [searchClicks, setSearchClicks] = useState('142.5K');
  const [impressions, setImpressions] = useState('2.84M');
  const [ctrRate, setCtrRate] = useState('4.8%');
  const [crawlErrors, setCrawlErrors] = useState(8);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // Trigger Live Technical Scanner Modal
  const startLiveTechnicalScan = () => {
    setIsScanning(true);
    setShowScanModal(true);
    setScanProgress(0);
    setScanStepIndex(0);

    const totalSteps = crawlerSteps.length;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep += 1;
      const progress = Math.min(Math.round((currentStep / totalSteps) * 100), 100);
      setScanStepIndex(Math.min(currentStep, totalSteps - 1));
      setScanProgress(progress);

      if (currentStep >= totalSteps) {
        clearInterval(interval);
        setTimeout(() => {
          setIsScanning(false);
          setShowScanModal(false);

          // Update Dynamic State Metrics
          setHealthScore(98);
          setSearchClicks('144.6K');
          setImpressions('2.86M');
          setCtrRate('5.1%');
          setCrawlErrors(2);
          setLastScanTime('Just Now');

          showToast('Live Technical Scan Complete! Metrics Updated.');
        }, 800);
      }
    }, 450);
  };

  return (
    <div className="space-y-8 text-left antialiased select-none">
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

      {/* SEO Laboratory Hero Header */}
      <div className="rounded-3xl bg-gradient-to-r from-[#6A1B2E] via-[#521221] to-[#3B0B16] text-white p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase bg-white/20 text-white px-3 py-1 rounded-full border border-white/20 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Enterprise SEO Intelligence Laboratory
              </span>
              <span className="text-[10px] font-bold text-white/70">Last Scan: {lastScanTime}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">
              Organic Search Operations & SERP Command Center
            </h1>
            <p className="text-xs text-white/80 font-semibold leading-relaxed">
              Google Search Console API integration, Core Web Vitals index, technical crawler scan, and AI recommendations.
            </p>
          </div>

          {/* Interactive Run Live Technical Scan Button */}
          <Button
            size="sm"
            disabled={isScanning}
            className={`bg-white text-[#6A1B2E] hover:bg-slate-100 font-black text-xs shrink-0 shadow-lg ${isScanning ? 'opacity-80 cursor-not-allowed' : ''}`}
            onClick={startLiveTechnicalScan}
          >
            {isScanning ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin text-[#6A1B2E]" /> Scanning ({scanProgress}%)
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Play className="w-4 h-4 text-[#6A1B2E] fill-current" /> Run Live Technical Scan
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Dynamic Health Score & Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 border border-slate-200/70 shadow-xs text-center bg-gradient-to-b from-white to-slate-50">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Website Health</span>
          <motion.div key={healthScore} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-2xl font-black text-emerald-600">
            {healthScore} / 100
          </motion.div>
          <span className="text-[9.5px] font-bold text-emerald-700 mt-1 block">✓ All Tests Passing</span>
        </Card>

        <Card className="p-4 border border-slate-200/70 shadow-xs text-center">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Search Clicks</span>
          <motion.div key={searchClicks} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-xl font-black text-blue-700">
            {searchClicks}
          </motion.div>
          <span className="text-[9.5px] font-semibold text-slate-400 mt-1 block">+2,134 this scan</span>
        </Card>

        <Card className="p-4 border border-slate-200/70 shadow-xs text-center">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Total Impressions</span>
          <motion.div key={impressions} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-xl font-black text-purple-700">
            {impressions}
          </motion.div>
          <span className="text-[9.5px] font-semibold text-slate-400 mt-1 block">+18,200 reach</span>
        </Card>

        <Card className="p-4 border border-slate-200/70 shadow-xs text-center">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Average CTR</span>
          <motion.div key={ctrRate} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-xl font-black text-emerald-700">
            {ctrRate}
          </motion.div>
          <span className="text-[9.5px] font-semibold text-slate-400 mt-1 block">Target: 4.5%</span>
        </Card>

        <Card className="p-4 border border-slate-200/70 shadow-xs text-center">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Crawl Errors</span>
          <motion.div key={crawlErrors} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-xl font-black text-amber-700">
            {crawlErrors} Errors
          </motion.div>
          <span className="text-[9.5px] font-semibold text-slate-400 mt-1 block">Reduced from 8</span>
        </Card>
      </div>

      {/* ── 1. INTERACTIVE GOOGLE SEARCH SIMULATOR ──────────────────────────── */}
      <Card className="p-6 border border-slate-300 rounded-3xl shadow-xl space-y-6 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-blue-600">G</span>
            <span className="text-2xl font-black text-red-500">o</span>
            <span className="text-2xl font-black text-amber-500">o</span>
            <span className="text-2xl font-black text-blue-600">g</span>
            <span className="text-2xl font-black text-emerald-500">l</span>
            <span className="text-2xl font-black text-red-500">e</span>
            <span className="text-xs font-black uppercase bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full ml-2">SERP Laboratory</span>
          </div>

          <div className="flex-1 max-w-md relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-full py-2 pl-4 pr-10 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
              placeholder="Simulate Live Google Query..."
            />
            <SearchIcon className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
          {/* Main SERP Results Left Column */}
          <div className="lg:col-span-2 space-y-5">
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
              <span className="text-[10px] font-black uppercase text-amber-900 bg-amber-200 px-2 py-0.5 rounded">Featured Snippet (Position 0)</span>
              <p className="text-xs font-semibold text-amber-950 leading-relaxed">
                "Reliance Digital is India's leading online electronics retail portal offering guaranteed same-day delivery, official brand warranty, and festival cashback deals on top smartphones, laptops, and smart TVs."
              </p>
              <span className="text-[10px] font-mono font-bold text-amber-800 block">Source: https://www.reliancedigital.in</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-[10px] font-mono text-slate-500">https://www.reliancedigital.in</span>
              <h3 className="text-sm font-black text-blue-800 hover:underline cursor-pointer">
                Reliance Digital — Buy Smartphones, Laptops & Appliances Online
              </h3>
              <p className="text-xs font-semibold text-slate-600">
                Shop latest electronics online at best prices in India. Free delivery, EMI options & 24/7 store pickup available.
              </p>
              <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-[10.5px] font-bold text-emerald-700">
                <span>✓ Organic Position #1</span>
                <span>Search Volume: 180,000/mo</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-black text-slate-900 block">People Also Ask (PAA)</span>
              <div className="space-y-2">
                {paaQuestions.map((paa, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden bg-white text-xs font-semibold">
                    <button
                      onClick={() => setOpenPaa(openPaa === idx ? null : idx)}
                      className="w-full p-3 flex items-center justify-between text-left text-slate-800 font-bold hover:bg-slate-50"
                    >
                      <span>{paa.q}</span>
                      {openPaa === idx ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                    </button>
                    {openPaa === idx && (
                      <div className="p-3 bg-slate-50 border-t border-slate-100 text-slate-600 text-[11px] leading-relaxed">
                        {paa.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-[10px] font-black uppercase text-slate-400 block">Google Knowledge Panel</span>
            <div className="h-36 rounded-xl bg-gradient-to-br from-[#6A1B2E] to-[#3B0B16] text-white p-4 flex flex-col justify-between">
              <span className="text-[9px] uppercase font-bold text-white/70">Verified Entity</span>
              <h4 className="text-lg font-black text-white">Reliance Digital</h4>
              <span className="text-[10px] text-white/80 font-bold">Consumer Electronics Retailer</span>
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700">
              <p>Customer Service: <span className="font-bold text-slate-900">1800 889 1055</span></p>
              <p>Headquarters: <span className="font-bold text-slate-900">Mumbai, Maharashtra</span></p>
              <p>Parent Organization: <span className="font-bold text-[#6A1B2E]">Reliance Retail</span></p>
            </div>
          </div>
        </div>
      </Card>

      {/* ── 2. AI FINDINGS PANEL (RECOMMENDATIONS) ────────────────────────── */}
      <Card className="p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase text-[#6A1B2E]">Post-Scan AI Audit Findings</span>
            <h3 className="text-base font-black text-slate-900">AI SEO Recommendation Engine</h3>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            6 Action Items Generated
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {initialAiRecommendations.map((rec, idx) => (
            <div key={idx} className={`p-4 rounded-2xl border ${rec.bg} space-y-2 text-left flex flex-col justify-between`}>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-black uppercase px-2 py-0.5 rounded bg-white">{rec.priority}</span>
                  <span className="text-xs font-black text-emerald-700">{rec.impact}</span>
                </div>
                <h4 className="text-xs font-black text-slate-900">{rec.title}</h4>
                <p className="text-[11px] font-semibold text-slate-600 leading-relaxed">{rec.desc}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[10px] font-bold text-slate-500">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" />{rec.time}</span>
                <button onClick={() => showToast(`Fix applied for: ${rec.title}`)} className="text-[#6A1B2E] font-black hover:underline">Apply Fix →</button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── LIVE TECHNICAL SCANNER CRAWLER OVERLAY MODAL ───────────────────── */}
      <AnimatePresence>
        {showScanModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950 z-50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-xl bg-slate-900 text-white rounded-3xl p-6 shadow-2xl border border-slate-800 text-left space-y-5"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                  <h3 className="text-sm font-black text-white">Ahrefs & Search Console Technical Crawler Engine</h3>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">{scanProgress}%</span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-2 rounded-full bg-gradient-to-r from-[#6A1B2E] to-emerald-500 transition-all duration-300" style={{ width: `${scanProgress}%` }} />
                </div>
              </div>

              {/* Live Scanning Step Stream */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 font-mono text-xs text-emerald-400 space-y-2 h-48 overflow-y-auto">
                <p className="text-slate-400">$ screaming-frog --crawl https://store.reliancedigital.in</p>
                <p className="text-slate-300">{crawlerSteps[scanStepIndex]}</p>
                {scanProgress >= 100 && (
                  <p className="text-emerald-400 font-bold">✓ Complete: All 2,420 URLs scanned successfully with 0 critical errors!</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
