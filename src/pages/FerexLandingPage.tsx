import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, Building2, ShieldCheck, ArrowRight,
  FileCheck, Plane, HelpCircle, LogIn, LogOut, ChevronDown, Mail, Phone, MapPin,
  User, Users, Clock, Calculator, Search, CheckCircle2, Award, Globe,
  DollarSign, Sparkles, BookOpen, FileText, Check, ArrowUpRight, Compass, Shield
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { useUniversities } from '../hooks/useUniversities';
import { useSystemConfig } from '../hooks/useSystemConfig';
import { getDashboardRoute, getPortalLabel } from '../lib/roleRouter';
import type { University } from '../lib/types';
import { MessageCircle } from 'lucide-react';

import ferexLogoImg from '../assets/ferex-logo.png';

export function formatFeeEURandINR(feeStr?: string): string {
  if (!feeStr || feeStr === 'N/A' || feeStr === '—') return '—';
  if (feeStr.includes('₹') && feeStr.includes('€')) return feeStr;

  const cleanStr = feeStr.replace(/,/g, '');
  const numMatch = cleanStr.match(/(\d+)/);
  if (!numMatch) return feeStr;

  const amount = parseInt(numMatch[1], 10);
  if (isNaN(amount) || amount === 0) return feeStr;

  const hasPerYear = feeStr.includes('/ yr') || feeStr.includes('/yr') || feeStr.includes('year') || feeStr.includes('/ year');
  const suffix = hasPerYear ? ' / yr' : '';

  if (feeStr.includes('€') || feeStr.toLowerCase().includes('eur') || feeStr.toLowerCase().includes('euro')) {
    const inrVal = Math.round(amount * 90);
    return `€${amount.toLocaleString('en-US')}${suffix} (~₹${inrVal.toLocaleString('en-IN')}${suffix})`;
  } else if (feeStr.includes('₹') || feeStr.toLowerCase().includes('inr') || feeStr.toLowerCase().includes('rs')) {
    const eurVal = Math.round(amount / 90);
    return `₹${amount.toLocaleString('en-IN')}${suffix} (~€${eurVal.toLocaleString('en-US')}${suffix})`;
  } else if (feeStr.includes('$') || feeStr.toLowerCase().includes('usd')) {
    const eurVal = Math.round(amount * 0.92);
    const inrVal = Math.round(amount * 83);
    return `$${amount.toLocaleString('en-US')} (€${eurVal.toLocaleString('en-US')} / ~₹${inrVal.toLocaleString('en-IN')})`;
  }

  const inrVal = Math.round(amount * 90);
  return `€${amount.toLocaleString('en-US')}${suffix} (~₹${inrVal.toLocaleString('en-IN')}${suffix})`;
}

// Country metadata helper for rich destination cards
const COUNTRY_DETAILS: Record<string, { flag: string; schengen: string; workRights: string; stayBack: string; avgLiving: string }> = {
  Poland: { flag: '🇵🇱', schengen: '27 Schengen Nations', workRights: '20 hrs/week + Full-time Summer', stayBack: '15 Months Post-Study Work', avgLiving: '€350 - €500 / mo' },
  Germany: { flag: '🇩🇪', schengen: '27 Schengen Nations', workRights: '140 Full or 280 Half Days/yr', stayBack: '18 Months Post-Study Job Search', avgLiving: '€850 - €1,100 / mo' },
  'Czech Republic': { flag: '🇨🇿', schengen: '27 Schengen Nations', workRights: 'Free Labor Market for Graduates', stayBack: '9 Months Job Seeking Visa', avgLiving: '€400 - €650 / mo' },
  Italy: { flag: '🇮🇹', schengen: '27 Schengen Nations', workRights: '20 hrs/week Legal Work', stayBack: '12 Months Permit to Stay', avgLiving: '€500 - €750 / mo' },
  Spain: { flag: '🇪🇸', schengen: '27 Schengen Nations', workRights: '30 hrs/week Part-time', stayBack: '12 Months Job Search Residence', avgLiving: '€550 - €800 / mo' },
  France: { flag: '🇫🇷', schengen: '27 Schengen Nations', workRights: '60% of Annual Legal Hours', stayBack: '12-24 Months APS Visa', avgLiving: '€700 - €1,000 / mo' },
  Lithuania: { flag: '🇱🇹', schengen: '27 Schengen Nations', workRights: '20 hrs/week during studies', stayBack: '12 Months TRC Extension', avgLiving: '€350 - €500 / mo' },
  Hungary: { flag: '🇭🇺', schengen: '27 Schengen Nations', workRights: '24 hrs/week Part-time', stayBack: '9 Months Study-to-Work Permit', avgLiving: '€400 - €550 / mo' },
  Austria: { flag: '🇦🇹', schengen: '27 Schengen Nations', workRights: '20 hrs/week with permit', stayBack: '12 Months Red-White-Red Card', avgLiving: '€800 - €1,100 / mo' },
  Netherlands: { flag: '🇳🇱', schengen: '27 Schengen Nations', workRights: '16 hrs/week Part-time', stayBack: '12 Months Orientation Year', avgLiving: '€900 - €1,300 / mo' },
};

export const FerexLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, session, profile, signOut } = useAuth();
  const { universities, loading: unisLoading } = useUniversities();
  const { config } = useSystemConfig();

  // Filters & State
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string>('All');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [faqCategory, setFaqCategory] = useState<string>('All');

  // Fee Calculator State
  const availableCountries = useMemo(() => {
    return Array.from(new Set(universities.map(u => u.country).filter(Boolean)));
  }, [universities]);

  const [calcCountry, setCalcCountry] = useState<string>(availableCountries[0] || 'Poland');
  
  // Sync selected country in calculator if availableCountries change
  React.useEffect(() => {
    if (availableCountries.length > 0 && !availableCountries.includes(calcCountry)) {
      setCalcCountry(availableCountries[0]);
    }
  }, [availableCountries, calcCountry]);

  const universitiesInCalcCountry = useMemo(() => {
    return universities.filter(u => u.country === calcCountry);
  }, [universities, calcCountry]);

  const [calcUniId, setCalcUniId] = useState<string>('');

  React.useEffect(() => {
    if (universitiesInCalcCountry.length > 0) {
      if (!universitiesInCalcCountry.some(u => u.id === calcUniId)) {
        setCalcUniId(universitiesInCalcCountry[0].id);
      }
    } else {
      setCalcUniId('');
    }
  }, [universitiesInCalcCountry, calcUniId]);

  const selectedCalcUni = useMemo(() => {
    return universities.find(u => u.id === calcUniId) || universitiesInCalcCountry[0];
  }, [universities, calcUniId, universitiesInCalcCountry]);

  const [calcProgramIdx, setCalcProgramIdx] = useState<number>(0);
  const [calcCurrency, setCalcCurrency] = useState<'EUR' | 'INR' | 'USD'>('EUR');
  const [calcAccomOption, setCalcAccomOption] = useState<'dorm' | 'private'>('dorm');

  // Navigation handlers
  const goToLogin = (initialMode: 'signin' | 'signup' = 'signin', prefilledUni?: string) => {
    if (prefilledUni) {
      navigate(`/login?mode=${initialMode}&uni=${encodeURIComponent(prefilledUni)}`);
    } else {
      navigate(`/login?mode=${initialMode}`);
    }
  };

  const handleAuthAction = () => {
    if (session && user) {
      const role = profile?.role || 'student';
      navigate(getDashboardRoute(role));
    } else {
      goToLogin('signin');
    }
  };

  const handleSignOut = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await signOut();
  };

  // Filtered universities for the grid
  const filteredUniversities = useMemo(() => {
    return universities.filter(u => {
      const matchCountry = selectedCountryFilter === 'All' || u.country === selectedCountryFilter;
      const matchCat = activeCategory === 'All' || u.category === activeCategory || (u.programs && u.programs.some(p => p.toLowerCase().includes(activeCategory.toLowerCase())));
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.city?.toLowerCase().includes(q) || u.country?.toLowerCase().includes(q);
      return matchCountry && matchCat && matchSearch;
    });
  }, [universities, selectedCountryFilter, activeCategory, searchQuery]);

  // Destination country statistics
  const destinationStats = useMemo(() => {
    const map = new Map<string, { count: number; unis: University[]; minFee: number }>();
    universities.forEach(u => {
      if (!u.country) return;
      const existing = map.get(u.country) || { count: 0, unis: [], minFee: 99999 };
      existing.count += 1;
      existing.unis.push(u);
      const match = (u.tuition_range || u.university_fee || '3000').match(/\d+/);
      if (match) {
        const val = parseInt(match[0], 10);
        if (val < existing.minFee) existing.minFee = val;
      }
      map.set(u.country, existing);
    });
    return Array.from(map.entries()).map(([country, data]) => ({
      country,
      count: data.count,
      minFee: data.minFee === 99999 ? 3000 : data.minFee,
      meta: COUNTRY_DETAILS[country] || { flag: '🇪🇺', schengen: 'Schengen Member', workRights: '20 hrs/week legal', stayBack: '12 Months Post-Study', avgLiving: '€400 - €600 / mo' }
    }));
  }, [universities]);

  // Calculator numerical values
  const calcValues = useMemo(() => {
    if (!selectedCalcUni) {
      return {
        tuitionEUR: 3200,
        tuitionINR: 288000,
        nawaEUR: 250,
        nawaINR: 22500,
        vfsEUR: 165,
        vfsINR: 15000,
        agencyEUR: 280,
        agencyINR: 25000,
        livingMonthlyEUR: 400,
        livingMonthlyINR: 36000,
        totalFirstYearEUR: 8695,
        totalFirstYearINR: 782500,
      };
    }

    // Extract tuition from selected course program or university fee
    let tuitionEUR = 3200;
    const prog = selectedCalcUni.course_programs?.[calcProgramIdx];
    const feeStr = prog?.tuition_fee || selectedCalcUni.tuition_range || selectedCalcUni.university_fee || '3200';
    const numMatch = feeStr.replace(/,/g, '').match(/\d+/);
    if (numMatch) {
      const parsed = parseInt(numMatch[0], 10);
      if (feeStr.includes('₹') || feeStr.toLowerCase().includes('inr')) {
        tuitionEUR = Math.round(parsed / 90);
      } else {
        tuitionEUR = parsed;
      }
    }

    const nawaRequired = selectedCalcUni.nawa_required !== false && selectedCalcUni.country.toLowerCase() === 'poland';
    const nawaEUR = nawaRequired ? 250 : 0;
    const vfsEUR = 165; // ~₹15,000
    const agencyEUR = 280; // ~₹25,000
    const monthlyLivingEUR = calcAccomOption === 'dorm' ? 380 : 550;
    const annualLivingEUR = monthlyLivingEUR * 12;

    const totalFirstYearEUR = tuitionEUR + nawaEUR + vfsEUR + agencyEUR + annualLivingEUR;

    return {
      tuitionEUR,
      tuitionINR: tuitionEUR * 90,
      nawaEUR,
      nawaINR: nawaEUR * 90,
      vfsEUR,
      vfsINR: vfsEUR * 90,
      agencyEUR,
      agencyINR: agencyEUR * 90,
      livingMonthlyEUR: monthlyLivingEUR,
      livingMonthlyINR: monthlyLivingEUR * 90,
      totalFirstYearEUR,
      totalFirstYearINR: totalFirstYearEUR * 90,
      nawaRequired,
    };
  }, [selectedCalcUni, calcProgramIdx, calcAccomOption]);

  const convertCurrency = (eurVal: number, inrVal: number) => {
    if (calcCurrency === 'INR') return `₹${inrVal.toLocaleString('en-IN')}`;
    if (calcCurrency === 'USD') return `$${Math.round(eurVal * 1.08).toLocaleString('en-US')}`;
    return `€${eurVal.toLocaleString('en-US')}`;
  };

  const scrollToCalculator = (uni?: University) => {
    if (uni) {
      setCalcCountry(uni.country);
      setCalcUniId(uni.id);
    }
    const el = document.getElementById('calculator');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const roadmapSteps = [
    { num: 1, title: 'Free Academic Profile Audit', desc: 'Comprehensive eligibility evaluation, academic transcript assessment, and tailored university course matching by European education specialists.' },
    { num: 2, title: 'Direct University Application', desc: 'Direct dossier submission to accredited European partner institutions with fast-track processing and guaranteed document review.' },
    { num: 3, title: 'Official Offer Letter Release', desc: 'Receipt of unconditional/conditional admission offer letter from partner universities issued directly within 7 to 14 business days.' },
    { num: 4, title: 'NAWA Legalization & Apostille', desc: 'Full handling of Polish National Agency for Academic Exchange (NAWA) equivalency audit, apostille verification, and Ministry kuratorium clearance.' },
    { num: 5, title: 'Tuition Deposit & Final Acceptance', desc: 'Secure payment of first semester/annual tuition fee directly into the official university bank account and release of the Final Acceptance Certificate.' },
    { num: 6, title: 'VFS Visa Appointment & File Filing', desc: 'Priority VFS Global Schengen appointment booking, complete visa docket compilation, and financial sponsorship statement verification.' },
    { num: 7, title: 'Embassy Mock Interview Training', desc: 'Intensive one-on-one interview preparation with visa officers to ensure 100% confidence on academic background and study intentions.' },
    { num: 8, title: 'National D Schengen Visa Stamp', desc: 'Receipt of the European National D student visa passport stamp granting entry and unrestricted free mobility across 27 Schengen nations.' },
    { num: 9, title: 'Pre-Departure & Dorm Check-in', desc: 'Flight booking assistance, airport pickup in Warsaw/Krakow, student dormitory room key handover, local Polish SIM card, and transit passes.' },
    { num: 10, title: 'TRC (Karta Pobytu) & Work Guidance', desc: 'Guidance for Polish Temporary Residence Card (Karta Pobytu) extension, local bank account setup, and legal 20 hrs/week part-time job placement aid.' },
  ];

  const faqs = [
    {
      cat: 'Admissions',
      q: 'How do I access and track my Ferex Student Portal?',
      a: 'Click on the "Sign In / Portal Login" button at the top of the page. You will receive 24/7 real-time tracking of your offer letter status, NAWA certification progress, and VFS visa appointment docket.'
    },
    {
      cat: 'Admissions',
      q: 'Can I apply for European universities without IELTS?',
      a: 'Yes! Most of our partner European institutions accept Medium of Instruction (MOI) certificates confirming that your prior education was conducted in English, waiving mandatory IELTS/TOEFL requirements.'
    },
    {
      cat: 'NAWA & Legalization',
      q: 'What is NAWA Legalization and why is it mandatory for Poland?',
      a: 'NAWA (Polish National Agency for Academic Exchange) is the Polish state authority that verifies international secondary and higher education qualifications. Polish universities and VFS consulates require an official NAWA statement of comparability. FEREX handles this end-to-end for you.'
    },
    {
      cat: 'Fees & Installments',
      q: 'Can I pay my tuition fee in installments?',
      a: 'Yes. Many universities allow semester-wise installment splits. Furthermore, our FEREX portal allows stage-wise milestone processing fees aligned with your admission milestones.'
    },
    {
      cat: 'Visa & Schengen',
      q: 'Can I work in Europe while studying on a student visa?',
      a: 'Yes! International students in Poland, Germany, Czech Republic, and most Schengen countries have legal rights to work 20 hours per week during academic semesters and full-time (40 hours/week) during summer holidays.'
    },
    {
      cat: 'Visa & Schengen',
      q: 'What is the post-study work visa duration after graduation?',
      a: 'Graduates in Poland are eligible for a 15-month Temporary Residence Permit (Karta Pobytu) for job seeking, while Germany offers 18 months, giving you ample time to transition into full-time European employment.'
    }
  ];

  const filteredFaqs = faqCategory === 'All' ? faqs : faqs.filter(f => f.cat === faqCategory);

  return (
    <div className="min-h-screen bg-[#24020B] text-white font-sans selection:bg-[#EAD5B5] selection:text-[#24020B] relative overflow-x-hidden">

      {/* ── TOP LIVE BROADCAST TICKER ────────────────────────────────────── */}
      {config.broadcast?.is_active && (
        <div className={`py-2 px-4 text-xs font-bold text-center flex items-center justify-center gap-2 relative z-50 border-b ${
          config.broadcast.urgency === 'urgent' ? 'bg-red-600 text-white border-red-700' :
          config.broadcast.urgency === 'warning' ? 'bg-amber-600 text-white border-amber-700' :
          config.broadcast.urgency === 'success' ? 'bg-emerald-700 text-white border-emerald-800' :
          'bg-[#50001D] text-[#E6CA9E] border-[#6A1B2E]'
        }`}>
          <span className="w-2 h-2 rounded-full bg-current animate-ping shrink-0" />
          <span>{config.broadcast.message}</span>
          {config.broadcast.link_url && (
            <a
              href={config.broadcast.link_url}
              className="underline font-black text-white ml-2 hover:opacity-80"
            >
              {config.broadcast.link_label || 'Learn More'} →
            </a>
          )}
        </div>
      )}

      {/* ── NAVBAR ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#2D030D]/95 backdrop-blur-md border-b border-[#52101F]/80 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8 lg:gap-10">
            {/* FEREX Logo */}
            <div className="select-none cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <img
                src={ferexLogoImg}
                alt="FEREX EDUCATION"
                className="h-11 sm:h-12 w-auto object-contain rounded-md"
              />
            </div>

            {/* Navigation Links */}
            <nav className="hidden lg:flex items-center gap-6 text-xs font-bold text-[#E5D2D5]">
              <a href="#destinations" className="hover:text-[#EAD5B5] transition-colors flex items-center gap-1">
                Destinations
              </a>
              <a href="#universities" className="hover:text-[#EAD5B5] transition-colors">Partner Universities</a>
              <a href="#calculator" className="text-[#E6CA9E] hover:text-white transition-colors flex items-center gap-1 font-extrabold bg-[#3E0916] px-3 py-1.5 rounded-lg border border-[#8C2C42]">
                <Calculator className="w-3.5 h-3.5" /> Fees Calculator
              </a>
              <a href="#process" className="hover:text-[#EAD5B5] transition-colors">10-Step Roadmap</a>
              <a href="#nawa" className="hover:text-[#EAD5B5] transition-colors">NAWA & Visa</a>
              <a href="#faq" className="hover:text-[#EAD5B5] transition-colors">FAQs</a>
              <a href="#about" className="hover:text-[#EAD5B5] transition-colors">About Us</a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {session && user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAuthAction}
                  className="flex items-center gap-2 h-10 px-4 sm:px-5 bg-[#3E0916] hover:bg-[#52101F] text-[#EAD5B5] rounded-xl text-xs font-bold transition-all border border-[#8C2C42] shadow-xs cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-[#E6CA9E]" />
                  <span>{getPortalLabel(profile?.role)}</span>
                </button>
                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="flex items-center justify-center w-10 h-10 bg-[#3E0916]/80 hover:bg-[#52101F] text-[#EAD5B5] hover:text-red-300 rounded-xl transition-all border border-[#8C2C42] shadow-xs cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => goToLogin('signin')}
                  className="hidden sm:flex items-center gap-2 h-10 px-4 bg-transparent hover:bg-white/5 text-[#EAD5B5] rounded-xl text-xs font-bold transition-all border border-[#8C2C42] cursor-pointer"
                >
                  <span>Portal Login</span>
                </button>
                <button
                  onClick={() => goToLogin('signup')}
                  className="flex items-center gap-2 h-10 px-4 sm:px-5 bg-[#E6CA9E] hover:bg-[#FAF4E8] text-[#24020B] rounded-xl text-xs font-black transition-all shadow-md active:scale-98 cursor-pointer"
                >
                  <GraduationCap className="w-4 h-4 text-[#24020B]" />
                  <span>Student Sign Up</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ────────────────────────────────────────────────────── */}
      <section className="relative min-h-[640px] lg:min-h-[720px] bg-[#24020B] overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-24">
        {/* Background Image on Right Side */}
        <div
          className="absolute inset-0 z-0 bg-no-repeat bg-cover bg-center lg:bg-right-top opacity-30"
          style={{
            backgroundImage: `url('/hero-students.jpg')`,
            backgroundPosition: 'right 30% center',
          }}
        />

        {/* Maroon Gradient Overlays */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            background: `
              linear-gradient(to right, #24020B 0%, #24020B 42%, rgba(36,2,11,0.92) 58%, rgba(36,2,11,0.6) 80%, rgba(36,2,11,0.2) 100%),
              linear-gradient(to top, #24020B 0%, rgba(36,2,11,0.85) 15%, transparent 35%),
              linear-gradient(to bottom, #24020B 0%, rgba(36,2,11,0.7) 10%, transparent 25%)
            `,
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-2xl space-y-6 text-left pt-2 lg:pt-4">
            
            {/* Top Pill Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-3.5 px-4 py-2 rounded-2xl border border-[#C5A880]/50 bg-[#350512]/90 backdrop-blur-md shadow-lg"
            >
              <div className="w-8 h-8 rounded-xl border border-[#C5A880]/40 bg-[#24020B] flex items-center justify-center text-[#EAD5B5] shrink-0">
                <Building2 className="w-4 h-4 text-[#E6CA9E]" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#EAD5B5] leading-tight">Official Overseas Higher Education Partner</div>
                <div className="text-[10.5px] font-medium text-[#D8C5C8] leading-tight mt-0.5">Direct Admissions • NAWA Legalization • Schengen Visas</div>
              </div>
            </motion.div>

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-3"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-serif font-bold text-[#FBF7F0] tracking-tight leading-[1.12]">
                Your Gateway to<br />
                <span className="text-[#E6CA9E]">Premier European</span><br />
                <span className="text-[#E6CA9E]">Higher Education</span>
              </h1>
              <div className="w-12 h-[2px] bg-[#C5A880]/80"></div>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-sm sm:text-base text-[#EAD8DB] font-normal leading-relaxed max-w-xl"
            >
              Direct university admissions across Poland, Germany, Czech Republic & Europe with Polish NAWA qualification audits, VFS visa filing, and post-arrival residency support.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2"
            >
              <button
                onClick={() => scrollToCalculator()}
                className="h-12 px-7 bg-[#E6CA9E] hover:bg-[#FAF4E8] text-[#24020B] rounded-xl font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-xl active:scale-98 cursor-pointer"
              >
                <Calculator className="w-4 h-4 text-[#24020B]" />
                <span>Calculate Total Study Cost</span>
              </button>

              <a
                href="#universities"
                className="h-12 px-6 bg-transparent hover:bg-white/5 text-white border border-white/25 hover:border-white/40 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <span>Browse {universities.length}+ Universities</span>
                <ChevronDown className="w-4 h-4 text-[#D8C5C8]" />
              </a>
            </motion.div>
          </div>

          {/* Floating Bottom Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-14 lg:mt-20 rounded-3xl border border-[#7A1D33]/60 bg-[#1D0108]/90 backdrop-blur-xl p-6 sm:p-7 shadow-2xl grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
          >
            {/* Stat 1 */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border border-[#C5A880]/50 bg-[#2D030D] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-[#E6CA9E]" />
              </div>
              <div className="text-left">
                <div className="text-2xl sm:text-3xl lg:text-[34px] font-serif font-bold text-[#EAD5B5] leading-none">1,250+</div>
                <div className="text-xs text-[#D8C5C8] font-medium mt-1">Students Enrolled</div>
                <div className="w-10 h-[2px] bg-[#C5A880]/60 mt-1.5" />
              </div>
            </div>

            {/* Stat 2 */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border border-[#C5A880]/50 bg-[#2D030D] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#E6CA9E]" />
              </div>
              <div className="text-left">
                <div className="text-2xl sm:text-3xl lg:text-[34px] font-serif font-bold text-[#EAD5B5] leading-none">99.4%</div>
                <div className="text-xs text-[#D8C5C8] font-medium mt-1">Visa Clearance Rate</div>
                <div className="w-10 h-[2px] bg-[#C5A880]/60 mt-1.5" />
              </div>
            </div>

            {/* Stat 3 */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border border-[#C5A880]/50 bg-[#2D030D] flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-[#E6CA9E]" />
              </div>
              <div className="text-left">
                <div className="text-2xl sm:text-3xl lg:text-[34px] font-serif font-bold text-[#EAD5B5] leading-none">{universities.length}+</div>
                <div className="text-xs text-[#D8C5C8] font-medium mt-1">European Universities</div>
                <div className="w-10 h-[2px] bg-[#C5A880]/60 mt-1.5" />
              </div>
            </div>

            {/* Stat 4 */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border border-[#C5A880]/50 bg-[#2D030D] flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-[#E6CA9E]" />
              </div>
              <div className="text-left">
                <div className="text-2xl sm:text-3xl lg:text-[34px] font-serif font-bold text-[#EAD5B5] leading-none">24/7</div>
                <div className="text-xs text-[#D8C5C8] font-medium mt-1">Live Portal Tracking</div>
                <div className="w-10 h-[2px] bg-[#C5A880]/60 mt-1.5" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── DESTINATIONS SECTION (DYNAMIC & CONFIGURED BY SUPERADMIN) ────────── */}
      <section id="destinations" className="py-20 bg-[#350512] border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wider flex items-center justify-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> European Study Destinations
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Explore Accredited European Countries</h2>
            <p className="text-xs sm:text-sm font-semibold text-rose-100/80">
              Low tuition fees, 20 hrs/week legal part-time work, post-study residency, and Schengen travel access.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {destinationStats.map(({ country, count, minFee, meta }) => (
              <motion.div
                key={country}
                whileHover={{ y: -4 }}
                className="bg-[#48081B] border border-white/15 rounded-3xl p-6 shadow-xl relative overflow-hidden group text-left flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{meta.flag}</span>
                      <div>
                        <h3 className="text-lg font-black text-white group-hover:text-amber-300 transition-colors">
                          {country}
                        </h3>
                        <p className="text-xs font-semibold text-rose-200/70">
                          {count} Partner {count === 1 ? 'University' : 'Universities'}
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] font-black bg-white/10 text-amber-300 border border-white/20 px-2.5 py-1 rounded-full">
                      from €{minFee.toLocaleString()}/yr
                    </span>
                  </div>

                  <div className="space-y-2.5 my-5 text-xs font-semibold text-rose-100/90 bg-[#330411]/60 p-3.5 rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-rose-200/70">Part-Time Work:</span>
                      <span className="font-extrabold text-white text-right">{meta.workRights}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-rose-200/70">Post-Study Visa:</span>
                      <span className="font-extrabold text-amber-300 text-right">{meta.stayBack}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-rose-200/70">Living Expenses:</span>
                      <span className="font-extrabold text-white text-right">{meta.avgLiving}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedCountryFilter(country);
                      const el = document.getElementById('universities');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="flex-1 h-10 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-white/20 cursor-pointer"
                  >
                    <span>View Universities</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setCalcCountry(country);
                      scrollToCalculator();
                    }}
                    title="Calculate Cost for this Country"
                    className="h-10 px-3 bg-[#E6CA9E] hover:bg-white text-[#24020B] rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Calculator className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PARTNER UNIVERSITIES (DYNAMIC FROM SUPABASE / HOOK) ──────────────── */}
      <section id="universities" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-6">
          <div>
            <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" /> European University Catalog
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-1">Featured Partner Universities</h2>
            <p className="text-xs sm:text-sm font-semibold text-rose-100/80 mt-1">
              Explore accredited European universities offering English-taught Bachelor, Master & PhD programs.
            </p>
          </div>

          {/* Search bar & Country filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-200/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search university or degree..."
                className="w-full sm:w-64 h-10 pl-9 pr-3.5 bg-[#3E0916] border border-[#8C2C42] rounded-xl text-xs font-semibold text-white placeholder:text-rose-200/50 focus:outline-none focus:border-[#C5A880]"
              />
            </div>

            <select
              value={selectedCountryFilter}
              onChange={(e) => setSelectedCountryFilter(e.target.value)}
              className="h-10 px-3 bg-[#3E0916] border border-[#8C2C42] rounded-xl text-xs font-bold text-[#EAD5B5] focus:outline-none cursor-pointer"
            >
              <option value="All">All Countries ({universities.length})</option>
              {availableCountries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          {['All', 'Engineering', 'Business', 'IT & CS', 'Humanities', 'Medicine'].map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-white text-[#50001D] shadow-lg font-black'
                  : 'bg-[#3E0916] text-white border border-[#8C2C42] hover:bg-[#52101F]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Dynamic Universities Grid */}
        {unisLoading ? (
          <div className="py-20 text-center text-xs font-bold text-rose-200/60">Loading universities catalog...</div>
        ) : filteredUniversities.length === 0 ? (
          <div className="bg-[#3E0916] border border-[#8C2C42] rounded-3xl p-12 text-center">
            <Building2 className="w-12 h-12 text-rose-200/40 mx-auto mb-3" />
            <h3 className="text-base font-black text-white">No Universities Found</h3>
            <p className="text-xs font-semibold text-rose-200/70 mt-1">Try selecting another category or clear the search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUniversities.map((uni) => (
              <motion.div
                layout
                key={uni.id || uni.name}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#350512] border border-white/15 rounded-3xl overflow-hidden flex flex-col justify-between hover:shadow-2xl hover:border-amber-300/40 transition-all group text-left"
              >
                <div>
                  {/* Photo Banner */}
                  <div className="h-48 relative overflow-hidden bg-[#24020B]">
                    <img
                      src={uni.image_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=600&q=80'}
                      alt={uni.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-85"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#350512] via-transparent to-transparent" />
                    
                    <span className="absolute top-3.5 right-3.5 text-[10.5px] font-black bg-[#24020B]/90 text-amber-300 border border-amber-300/40 px-3 py-1 rounded-full shadow-md backdrop-blur-xs">
                      {uni.badge || 'Accredited'}
                    </span>

                    <div className="absolute bottom-3 left-3.5 flex items-center gap-1.5 text-xs font-bold text-white bg-black/50 px-2.5 py-1 rounded-lg backdrop-blur-xs">
                      <MapPin className="w-3.5 h-3.5 text-rose-400" /> {uni.city ? `${uni.city}, ${uni.country}` : uni.country}
                    </div>
                  </div>

                  <div className="p-5 space-y-3.5">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                        {uni.category || 'Engineering & Tech'}
                      </span>
                      <h3 className="text-base font-extrabold text-white leading-snug group-hover:text-amber-300 transition-colors mt-2">
                        {uni.name}
                      </h3>
                    </div>

                    <p className="text-xs font-semibold text-rose-100/80 line-clamp-2">
                      {uni.description || (uni.programs ? uni.programs.join(' • ') : 'English-taught Bachelor and Master degree programs.')}
                    </p>
                    
                    {/* Fee & NAWA status */}
                    <div className="pt-3 border-t border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-rose-200/70">Tuition Fee:</span>
                        <span className="font-black text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20 text-right">
                          {formatFeeEURandINR(uni.tuition_range || uni.university_fee || uni.course_programs?.[0]?.tuition_fee)}
                        </span>
                      </div>

                      {uni.nawa_required && (
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-200 font-bold bg-[#48081B] px-2.5 py-1 rounded-lg border border-white/10">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" /> NAWA Legalization Handled by Ferex
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0 grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => scrollToCalculator(uni)}
                    className="h-10 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Calculator className="w-3.5 h-3.5 text-amber-300" />
                    <span>Calculate</span>
                  </button>

                  <button
                    onClick={() => goToLogin('signup', uni.name)}
                    className="h-10 bg-[#E6CA9E] hover:bg-white text-[#24020B] rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 shadow-md cursor-pointer"
                  >
                    <span>Apply Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ── INTERACTIVE EUROPEAN FEES & COST CALCULATOR ───────────────────────── */}
      <section id="calculator" className="py-20 bg-[#1D0108] border-y border-[#52101F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-black text-amber-300 uppercase tracking-wider inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3E0916] border border-[#8C2C42]">
              <Calculator className="w-3.5 h-3.5 text-amber-300" /> Interactive European Fee & Living Cost Estimator
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif font-black text-white tracking-tight">
              Calculate Your Complete 1st Year Study Investment
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-rose-100/80">
              Select your preferred European destination and partner university to calculate accurate tuition, NAWA verification, VFS visa filing, and living costs in real time.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Step 1 & 2: Selection Inputs (5 Cols) */}
            <div className="lg:col-span-5 bg-[#2E040E] border border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#E6CA9E] text-[#24020B] font-black text-xs flex items-center justify-center">1</span>
                  Configure Study Options
                </h3>

                {/* Currency Switcher */}
                <div className="flex items-center gap-1 bg-[#1A0107] p-1 rounded-xl border border-white/10">
                  {(['EUR', 'INR', 'USD'] as const).map(curr => (
                    <button
                      key={curr}
                      onClick={() => setCalcCurrency(curr)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                        calcCurrency === curr
                          ? 'bg-[#E6CA9E] text-[#24020B]'
                          : 'text-rose-200/70 hover:text-white'
                      }`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination Country */}
              <div>
                <label className="block text-[11px] font-black uppercase text-amber-300 tracking-wider mb-1.5">
                  Select European Country
                </label>
                <select
                  value={calcCountry}
                  onChange={(e) => setCalcCountry(e.target.value)}
                  className="w-full h-11 px-3.5 bg-[#1F020A] border border-white/20 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-300 cursor-pointer"
                >
                  {availableCountries.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Partner University */}
              <div>
                <label className="block text-[11px] font-black uppercase text-amber-300 tracking-wider mb-1.5">
                  Select Partner University
                </label>
                <select
                  value={calcUniId}
                  onChange={(e) => {
                    setCalcUniId(e.target.value);
                    setCalcProgramIdx(0);
                  }}
                  className="w-full h-11 px-3.5 bg-[#1F020A] border border-white/20 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-300 cursor-pointer"
                >
                  {universitiesInCalcCountry.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.city || u.country})</option>
                  ))}
                </select>
              </div>

              {/* Degree Program / Level */}
              {selectedCalcUni?.course_programs && selectedCalcUni.course_programs.length > 0 && (
                <div>
                  <label className="block text-[11px] font-black uppercase text-amber-300 tracking-wider mb-1.5">
                    Select Degree Program / Major
                  </label>
                  <select
                    value={calcProgramIdx}
                    onChange={(e) => setCalcProgramIdx(Number(e.target.value))}
                    className="w-full h-11 px-3.5 bg-[#1F020A] border border-white/20 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-300 cursor-pointer"
                  >
                    {selectedCalcUni.course_programs.map((p, idx) => (
                      <option key={p.id || idx} value={idx}>
                        {p.name} — ({p.degree_level}) [{p.tuition_fee}]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Accommodation Preference */}
              <div>
                <label className="block text-[11px] font-black uppercase text-amber-300 tracking-wider mb-1.5">
                  Accommodation Preference
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCalcAccomOption('dorm')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      calcAccomOption === 'dorm'
                        ? 'bg-[#48081B] border-amber-300 text-white shadow-md'
                        : 'bg-[#1F020A] border-white/10 text-rose-200/70 hover:border-white/30'
                    }`}
                  >
                    <div className="text-xs font-black text-white">Student Dormitory</div>
                    <div className="text-[10.5px] font-semibold text-amber-300 mt-0.5">~€350-400 / month</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCalcAccomOption('private')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      calcAccomOption === 'private'
                        ? 'bg-[#48081B] border-amber-300 text-white shadow-md'
                        : 'bg-[#1F020A] border-white/10 text-rose-200/70 hover:border-white/30'
                    }`}
                  >
                    <div className="text-xs font-black text-white">Private Studio</div>
                    <div className="text-[10.5px] font-semibold text-amber-300 mt-0.5">~€500-600 / month</div>
                  </button>
                </div>
              </div>

              {/* Direct Apply Button */}
              <div className="pt-2">
                <button
                  onClick={() => goToLogin('signup', selectedCalcUni?.name)}
                  className="w-full h-12 bg-[#E6CA9E] hover:bg-white text-[#24020B] rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl active:scale-98 transition-all cursor-pointer"
                >
                  <GraduationCap className="w-4 h-4 text-[#24020B]" />
                  <span>Apply with This Fee Estimate</span>
                  <ArrowRight className="w-4 h-4 text-[#24020B]" />
                </button>
                <p className="text-[10.5px] font-semibold text-rose-200/60 text-center mt-2">
                  No advance payment needed to register and evaluate your profile.
                </p>
              </div>
            </div>

            {/* Step 3: Live Itemized Cost Matrix (7 Cols) */}
            <div className="lg:col-span-7 bg-[#2E040E] border border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#E6CA9E] text-[#24020B] font-black text-xs flex items-center justify-center">2</span>
                    Estimated Cost of Study Breakdown
                  </h3>
                  <p className="text-[11px] font-semibold text-rose-200/70 mt-0.5">
                    {selectedCalcUni?.name || 'Selected European University'} • {calcCountry}
                  </p>
                </div>

                <span className="text-xs font-black text-amber-300 bg-[#1A0107] px-3 py-1 rounded-xl border border-white/10">
                  {calcCurrency} Currency
                </span>
              </div>

              {/* Matrix Rows */}
              <div className="space-y-3">
                {/* 1. Tuition */}
                <div className="p-3.5 bg-[#1F020A] border border-white/10 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-400/10 text-amber-300 flex items-center justify-center border border-amber-400/20">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">University Tuition Fee (1st Year)</div>
                      <div className="text-[10.5px] font-medium text-rose-200/60">Payable in 2 semester installments</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-white">
                      {convertCurrency(calcValues.tuitionEUR, calcValues.tuitionINR)}
                    </div>
                    <div className="text-[10px] font-semibold text-rose-200/60">
                      ~{convertCurrency(Math.round(calcValues.tuitionEUR / 2), Math.round(calcValues.tuitionINR / 2))} / sem
                    </div>
                  </div>
                </div>

                {/* 2. NAWA Legalization */}
                {calcValues.nawaRequired && (
                  <div className="p-3.5 bg-[#1F020A] border border-white/10 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-400/10 text-emerald-300 flex items-center justify-center border border-emerald-400/20">
                        <FileCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">NAWA Qualification Legalization & Apostille</div>
                        <div className="text-[10.5px] font-medium text-rose-200/60">Polish Government state certificate handling</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-emerald-400">
                        {convertCurrency(calcValues.nawaEUR, calcValues.nawaINR)}
                      </div>
                      <div className="text-[10px] font-semibold text-rose-200/60">One-time fee</div>
                    </div>
                  </div>
                )}

                {/* 3. VFS Global Visa Fee */}
                <div className="p-3.5 bg-[#1F020A] border border-white/10 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-400/10 text-blue-300 flex items-center justify-center border border-blue-400/20">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">VFS Global Schengen Visa Appointment & Filing</div>
                      <div className="text-[10.5px] font-medium text-rose-200/60">Embassy slot guarantee & document compilation</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-white">
                      {convertCurrency(calcValues.vfsEUR, calcValues.vfsINR)}
                    </div>
                    <div className="text-[10px] font-semibold text-rose-200/60">Payable at VFS center</div>
                  </div>
                </div>

                {/* 4. Estimated Annual Living Expenses */}
                <div className="p-3.5 bg-[#1F020A] border border-white/10 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-400/10 text-purple-300 flex items-center justify-center border border-purple-400/20">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Estimated Annual Living & Accommodation</div>
                      <div className="text-[10.5px] font-medium text-rose-200/60">
                        {calcAccomOption === 'dorm' ? 'University Student Dormitory' : 'Private Studio Apartment'} (12 Months)
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-white">
                      {convertCurrency(calcValues.livingMonthlyEUR * 12, calcValues.livingMonthlyINR * 12)}
                    </div>
                    <div className="text-[10px] font-semibold text-rose-200/60">
                      ~{convertCurrency(calcValues.livingMonthlyEUR, calcValues.livingMonthlyINR)} / mo
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Summary Box */}
              <div className="p-5 bg-gradient-to-r from-[#48081B] via-[#52101F] to-[#48081B] border border-amber-300/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                <div>
                  <div className="text-xs font-extrabold text-amber-300 uppercase tracking-wider">
                    Total Estimated 1st Year Investment
                  </div>
                  <div className="text-[11px] font-medium text-rose-100/80 mt-0.5">
                    Includes 1 Year Tuition + NAWA Legalization + VFS Visa + 12 Months Living
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <div className="text-2xl sm:text-3xl font-serif font-black text-white leading-none">
                    {convertCurrency(calcValues.totalFirstYearEUR, calcValues.totalFirstYearINR)}
                  </div>
                  <div className="text-[10.5px] font-bold text-emerald-400 mt-1">
                    Off-set by €700-1,000/mo part-time earnings
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 10-STEP ROADMAP ─────────────────────────────────────────────────── */}
      <section id="process" className="py-20 bg-[#350512] border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wider flex items-center justify-center gap-1">
              <Compass className="w-3.5 h-3.5" /> Streamlined European Pathway
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Your 10-Step European Study Roadmap</h2>
            <p className="text-xs sm:text-sm font-semibold text-rose-100/80">
              Track every stage transparently in real-time inside your personal Ferex Student Portal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {roadmapSteps.map((step) => (
              <div
                key={step.num}
                className="bg-[#48081B] border border-white/15 rounded-2xl p-5 relative overflow-hidden text-left hover:border-amber-300/40 transition-all shadow-md group"
              >
                <span className="text-3xl font-black text-white/10 absolute top-2.5 right-3 select-none group-hover:text-amber-300/20 transition-colors">
                  {step.num < 10 ? `0${step.num}` : step.num}
                </span>

                <div className="w-8 h-8 rounded-lg bg-[#E6CA9E] text-[#24020B] font-black text-xs flex items-center justify-center mb-3 shadow-sm">
                  #{step.num}
                </div>

                <h4 className="text-xs font-black text-white mb-1.5 leading-snug group-hover:text-amber-300 transition-colors">
                  {step.title}
                </h4>

                <p className="text-[11px] font-semibold text-rose-100/80 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NAWA & VISA LEGALIZATION DEEP DIVE ───────────────────────────────── */}
      <section id="nawa" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Government Legalization Authority
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Polish NAWA Legalization & VFS Visa Processing
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-rose-100/80 leading-relaxed">
                FEREX Education is an authorized higher education consultancy managing the entire Polish National Agency for Academic Exchange (NAWA) qualification equivalency and Kuratorium certification process.
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="p-4 bg-[#350512] border border-white/15 rounded-2xl flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white">NAWA Qualification Audit & Apostille</h4>
                  <p className="text-[11px] font-semibold text-rose-200/70 mt-0.5 leading-relaxed">
                    Direct submission of 10th, 12th marksheets and Bachelor degree transcripts to NAWA in Warsaw for official Polish equivalency verification.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-[#350512] border border-white/15 rounded-2xl flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-blue-400/20 text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white">VFS Global Appointment & Mock Interviews</h4>
                  <p className="text-[11px] font-semibold text-rose-200/70 mt-0.5 leading-relaxed">
                    Confirmed appointment booking at VFS visa application centers with personalized dossier compilation and consular mock interview coaching.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-[#350512] border border-white/15 rounded-2xl flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Plane className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white">Post-Arrival & TRC (Karta Pobytu) Support</h4>
                  <p className="text-[11px] font-semibold text-rose-200/70 mt-0.5 leading-relaxed">
                    Warsaw & Krakow airport reception, student dormitory key handover, local Polish bank account setup, and legal residency extension assistance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Feature Card */}
          <div className="bg-gradient-to-br from-[#48081B] to-[#24020B] border border-amber-300/30 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#E6CA9E] text-[#24020B] font-black flex items-center justify-center text-lg shadow-md">
                  🇵🇱
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Poland National D Student Visa</h3>
                  <p className="text-xs font-semibold text-rose-200/70">100% Compliant Schengen Processing</p>
                </div>
              </div>
              <span className="text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full">
                99.4% Success
              </span>
            </div>

            <div className="space-y-3 text-xs font-semibold text-rose-100/90">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Full Schengen Visa with free travel across 27 EU nations</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-300 shrink-0" />
                <span>20 Hours/Week legal part-time employment rights</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-300 shrink-0" />
                <span>15-Month post-study work permit (Karta Pobytu)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-300 shrink-0" />
                <span>No mandatory IELTS with Medium of Instruction certificate</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => goToLogin('signup')}
                className="w-full h-12 bg-white hover:bg-[#FAF4E8] text-[#24020B] rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer"
              >
                <span>Register for Profile Evaluation & NAWA Check</span>
                <ArrowRight className="w-4 h-4 text-[#24020B]" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQS ───────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 bg-[#350512] border-y border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
          <div className="text-center mb-12 space-y-2">
            <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wider flex items-center justify-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" /> Got Questions?
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Frequently Asked Questions</h2>
            <p className="text-xs sm:text-sm font-semibold text-rose-100/80">
              Clear answers on European admissions, NAWA qualification legalization, and student visas.
            </p>
          </div>

          {/* FAQ Category Pills */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-4 mb-6">
            {['All', 'Admissions', 'NAWA & Legalization', 'Fees & Installments', 'Visa & Schengen'].map(cat => (
              <button
                key={cat}
                onClick={() => setFaqCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  faqCategory === cat
                    ? 'bg-white text-[#24020B] font-black'
                    : 'bg-[#48081B] text-rose-200/80 hover:text-white border border-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-3.5">
            {filteredFaqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div key={idx} className="bg-[#48081B] border border-white/15 rounded-2xl overflow-hidden shadow-lg transition-colors">
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 focus:outline-none cursor-pointer"
                  >
                    <span className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2.5">
                      <HelpCircle className="w-4 h-4 text-amber-300 shrink-0" />
                      {faq.q}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-rose-200 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-amber-300' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-5 pb-5 pt-0 border-t border-white/10"
                      >
                        <p className="text-xs font-semibold text-rose-100/90 leading-relaxed pt-3">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── ABOUT US SECTION ─────────────────────────────────────────────────── */}
      <section id="about" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> About FEREX Higher Education
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Premier Higher Education Consultancy with Local European Presence
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-rose-100/90 leading-relaxed">
              Founded with the vision of making top-tier European higher education accessible and transparent, FEREX Education partners directly with leading universities across Poland, Germany, Czech Republic, Italy, and Spain.
            </p>
            <p className="text-xs sm:text-sm font-semibold text-rose-100/80 leading-relaxed">
              Unlike generic consultancies, we maintain active local operational representation in Warsaw and Krakow. From initial profile audit to NAWA apostille, VFS mock interviews, airport pickup, and dormitory check-in, our student advisors walk every step of the journey with you.
            </p>

            <div className="pt-2 grid grid-cols-3 gap-4 border-t border-white/10">
              <div>
                <div className="text-xl font-serif font-black text-amber-300">100%</div>
                <div className="text-[11px] font-semibold text-rose-200/70">Authorized Admissions</div>
              </div>
              <div>
                <div className="text-xl font-serif font-black text-amber-300">45+</div>
                <div className="text-[11px] font-semibold text-rose-200/70">Partner Universities</div>
              </div>
              <div>
                <div className="text-xl font-serif font-black text-amber-300">24/7</div>
                <div className="text-[11px] font-semibold text-rose-200/70">Portal Tracking</div>
              </div>
            </div>
          </div>

          <div className="bg-[#350512] border border-white/15 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
            <h3 className="text-base font-black text-white border-b border-white/10 pb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-400" /> European Headquarters & Offices
            </h3>

            <div className="space-y-4 text-xs font-semibold text-rose-100/90">
              <div className="p-3.5 bg-[#48081B] rounded-2xl border border-white/10">
                <div className="font-extrabold text-white">Warsaw Operational Office</div>
                <div className="text-rose-200/70 mt-0.5">Al. Jerozolimskie, 00-001 Warsaw, Poland</div>
                <div className="text-amber-300 text-[11px] mt-1 flex items-center gap-1"><Mail className="w-3 h-3" /> warsaw@ferexeducation.com</div>
              </div>

              <div className="p-3.5 bg-[#48081B] rounded-2xl border border-white/10">
                <div className="font-extrabold text-white">Krakow Student Support Hub</div>
                <div className="text-rose-200/70 mt-0.5">ul. Floriańska, 31-019 Kraków, Poland</div>
                <div className="text-amber-300 text-[11px] mt-1 flex items-center gap-1"><Phone className="w-3 h-3" /> +48 22 123 4567</div>
              </div>
            </div>

            <button
              onClick={() => goToLogin('signup')}
              className="w-full h-11 bg-[#E6CA9E] hover:bg-white text-[#24020B] rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <span>Schedule Free Counselor Consultation</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── HIGH IMPACT CTA BANNER ─────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-left">
        <div className="bg-gradient-to-r from-[#6A1B2E] via-[#50001D] to-[#3B0C17] border border-amber-300/30 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl text-white">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-5">
            <h2 className="text-2xl sm:text-4xl font-serif font-black text-white tracking-tight">
              Ready to Begin Your European Higher Education Journey?
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-rose-100/90 leading-relaxed">
              Access your personalized student application portal, track your visa, upload documents, and view fee receipts in real time.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => goToLogin('signup')}
                className="w-full sm:w-auto h-12 px-8 bg-[#E6CA9E] hover:bg-white text-[#24020B] rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-xl active:scale-98 cursor-pointer"
              >
                <GraduationCap className="w-5 h-5 text-[#24020B]" />
                <span>Create Student Account</span>
              </button>
              <button
                onClick={() => goToLogin('signin')}
                className="w-full sm:w-auto h-12 px-8 bg-transparent hover:bg-white/10 text-white border border-white/30 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-amber-300" />
                <span>Sign In to Existing Portal</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="bg-[#1D0108] border-t border-white/10 pt-16 pb-12 text-xs font-semibold text-rose-200/80 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="space-y-3 md:col-span-1">
              <div className="cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <img
                  src={ferexLogoImg}
                  alt="FEREX EDUCATION"
                  className="h-10 w-auto object-contain rounded-md"
                />
              </div>
              <p className="text-xs font-semibold text-rose-200/70 leading-relaxed pt-2">
                Premier higher education consultancy facilitating direct European university admissions, Polish NAWA qualification legalization, and Schengen student visas.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4">Quick Navigation</h4>
              <ul className="space-y-2">
                <li><a href="#destinations" className="hover:text-white transition-colors">Study Destinations</a></li>
                <li><a href="#universities" className="hover:text-white transition-colors">Partner Universities</a></li>
                <li><a href="#calculator" className="hover:text-white transition-colors">Cost & Fee Calculator</a></li>
                <li><a href="#process" className="hover:text-white transition-colors">10-Step Roadmap</a></li>
                <li><a href="#nawa" className="hover:text-white transition-colors">NAWA Legalization</a></li>
                <li><button onClick={() => goToLogin('signin')} className="hover:text-white transition-colors cursor-pointer">Student Portal Login</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4">Admissions & Desks</h4>
              <ul className="space-y-2 text-rose-200/70">
                <li className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
                  <span>{config.branding.office_address || 'Warsaw, Poland & Bangalore, India'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <a href={`mailto:${config.branding.support_email}`} className="hover:text-white transition-colors">{config.branding.support_email || 'admissions@ferexeducation.com'}</a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>{config.branding.support_phone || '+91 80001 22334'}</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4">Student Access</h4>
              <p className="text-xs font-semibold text-rose-200/70 mb-3">
                Already registered? Sign in to view your offer letters, NAWA status, and VFS tracking.
              </p>
              <button
                onClick={() => goToLogin('signin')}
                className="w-full h-9 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-extrabold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-300" /> Portal Login
              </button>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-rose-200/60">
            <p>© {new Date().getFullYear()} {config.branding.org_name || 'FEREX Higher Education Global'}. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <button onClick={() => goToLogin('signin')} className="hover:text-white cursor-pointer">Privacy Policy</button>
              <button onClick={() => goToLogin('signin')} className="hover:text-white cursor-pointer">Terms of Service</button>
              <button onClick={() => goToLogin('signin')} className="hover:text-white cursor-pointer">Document Processing Consent</button>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Admissions Assistant Widget */}
      {config.features?.enable_whatsapp_support_widget && config.branding?.whatsapp_number && (
        <a
          href={`https://wa.me/${config.branding.whatsapp_number.replace(/[^0-9]/g, '')}?text=Hello%20FEREX%20Admissions%20Team%2C%20I%20would%20like%20to%20know%20more%20about%20European%20university%20programs.`}
          target="_blank"
          rel="noopener noreferrer"
          title="Chat with FEREX Admissions on WhatsApp"
          className="fixed bottom-6 right-6 z-40 bg-emerald-600 hover:bg-emerald-700 text-white p-3.5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center gap-2 border-2 border-white/40"
        >
          <MessageCircle className="w-5 h-5 fill-white" />
          <span className="text-xs font-black hidden sm:inline pr-1">Admissions WhatsApp</span>
        </a>
      )}

    </div>
  );
};
