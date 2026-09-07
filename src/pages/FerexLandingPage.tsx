import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, Building2, ShieldCheck, ArrowRight,
  FileCheck, Plane, HelpCircle, LogIn, LogOut, ChevronDown, Mail, Phone, MapPin,
  User, Users, Clock, Calculator, Search, Award, Globe,
  Check, ArrowUpRight, Compass, Sparkles, CheckCircle2, ChevronRight, Star
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUniversities } from '../hooks/useUniversities';
import { useSystemConfig } from '../hooks/useSystemConfig';
import { getDashboardRoute } from '../lib/roleRouter';
import type { University } from '../lib/types';
import { Logo, FerexVectorMark } from '../components/Logo';

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
  const { universities } = useUniversities();
  const { config } = useSystemConfig();

  // Filters & State
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string>('All');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  // Fee Calculator State
  const availableCountries = useMemo(() => {
    return Array.from(new Set(universities.map(u => u.country).filter(Boolean)));
  }, [universities]);

  const [calcCountry, setCalcCountry] = useState<string>(availableCountries[0] || 'Poland');
  
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

  const [calcProgramIdx] = useState<number>(0);
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
    let tuitionEUR = 3200;
    if (selectedCalcUni) {
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
    }

    const nawaRequired = selectedCalcUni?.nawa_required !== false && selectedCalcUni?.country.toLowerCase() === 'poland';
    const nawaEUR = nawaRequired ? 250 : 0;
    const vfsEUR = 165;
    const agencyEUR = 280;
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

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const roadmapSteps = [
    { num: 1, title: 'Free Academic Profile Audit', desc: 'Comprehensive eligibility evaluation, transcript assessment, and tailored university course matching by European education specialists.' },
    { num: 2, title: 'Direct University Application', desc: 'Direct dossier submission to accredited European partner institutions with fast-track processing and guaranteed document review.' },
    { num: 3, title: 'Official Offer Letter Release', desc: 'Receipt of unconditional/conditional admission offer letter from partner universities issued directly within 7 to 14 business days.' },
    { num: 4, title: 'Tuition Wire Clearance & Receipt', desc: 'Safe, zero-markup tuition deposit wire to university bank account with official payment confirmation voucher generated.' },
    { num: 5, title: 'NAWA / MEA Apostille Legalization', desc: 'Complete government authentication of high school/bachelor degrees for Polish Ministry (NAWA) & EU equivalency validation.' },
    { num: 6, title: 'VFS Global Filing & Visa Coaching', desc: 'Appointment booking at VFS visa centers with personalized dossier compilation, financial sponsor proof, and consular mock coaching.' },
    { num: 7, title: 'Schengen Arrival & Dorm Check-in', desc: 'Airport pickup in Warsaw/Krakow/Berlin, student dormitory check-in, TRC residence permit filing, and SIM/bank account setup.' },
  ];

  const faqs = [
    { q: 'What are the main intake seasons for European Universities?', a: 'European universities primarily operate two major intake cycles: Autumn Intake (September/October) and Spring Intake (February/March). Autumn is the flagship intake offering all bachelor, master, and doctoral programs.' },
    { q: 'Is IELTS or TOEFL mandatory for admission in Poland and Germany?', a: 'Many of our partner universities accept Medium of Instruction (MOI) certificates from your previous high school or college, or conduct their own internal English proficiency interview, allowing you to secure admission without mandatory IELTS.' },
    { q: 'What is NAWA Legalization and why is it needed?', a: 'NAWA (Polish National Agency for Academic Exchange) verifies foreign educational certificates to confirm they meet Polish academic standards. FEREX manages the entire legalization and apostille chain end-to-end on your behalf.' },
    { q: 'Can students work legally while studying in Europe?', a: 'Yes! International students in Schengen countries (like Poland, Germany, Czechia) have legal part-time work rights (typically 20 hours/week during semesters and full-time during holidays) with generous 9-18 months post-study stay-back visas.' },
    { q: 'What is the total estimated annual cost for tuition and living in Poland?', a: 'Tuition fees at reputable public and private universities range between €2,500 - €4,500 per year (~₹2.2L - ₹4.0L/yr). Monthly student living expenses including dormitory accommodation, food, and transport average €350 - €500 (~₹31k - ₹45k/mo).' },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#58051E] selection:text-white">
      
      {/* 1. TOP ANNOUNCEMENT BANNER */}
      <div className="bg-[#58051E] text-white py-2 px-4 text-xs font-semibold">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white text-[10px] uppercase font-black px-2 py-0.5 rounded-md">
              Admissions Open
            </span>
            <span>Autumn 2026 & Spring 2027 European University Intakes are now live!</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="hidden md:inline text-white/80">Guaranteed Admission Letters within 10 Days</span>
            <button
              onClick={() => goToLogin('signup')}
              className="text-white hover:text-amber-200 font-bold underline flex items-center gap-1 cursor-pointer"
            >
              Start Free Application <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. STICKY FROSTED NAVIGATION HEADER */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Brand Logo */}
          <div className="cursor-pointer" onClick={() => navigate('/')}>
            <Logo size="md" variant="full" />
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-bold text-slate-600">
            <button onClick={() => scrollToSection('universities')} className="hover:text-[#58051E] transition-colors cursor-pointer">
              Partner Universities
            </button>
            <button onClick={() => scrollToSection('destinations')} className="hover:text-[#58051E] transition-colors cursor-pointer">
              Schengen Destinations
            </button>
            <button onClick={() => scrollToSection('calculator')} className="hover:text-[#58051E] transition-colors cursor-pointer">
              Cost Calculator
            </button>
            <button onClick={() => scrollToSection('roadmap')} className="hover:text-[#58051E] transition-colors cursor-pointer">
              Visa & NAWA Roadmap
            </button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-[#58051E] transition-colors cursor-pointer">
              Admissions FAQ
            </button>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {session && user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAuthAction}
                  className="h-10 px-4 rounded-xl bg-[#58051E] text-white text-xs font-bold hover:bg-[#430316] transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" /> Dashboard
                </button>
                <button
                  onClick={handleSignOut}
                  className="h-10 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => goToLogin('signin')}
                  className="h-10 px-4 rounded-xl text-xs font-bold text-slate-700 hover:text-[#58051E] hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#58051E]" /> Portal Login
                </button>
                <button
                  onClick={() => goToLogin('signup')}
                  className="h-10 px-5 rounded-xl bg-[#58051E] text-white text-xs font-black hover:bg-[#430316] transition-all shadow-md shadow-[#58051E]/20 flex items-center gap-1.5 active:scale-98 cursor-pointer"
                >
                  Apply Online <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION (LIGHT-THEMED EDITORIAL HERO) */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50/80 via-white to-white py-16 lg:py-24 border-b border-slate-100">
        
        {/* Subtle Background Geometry */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-[#58051E]/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-[#58051E]/5 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Hero Headline & Value Props */}
            <div className="lg:col-span-7 space-y-6 text-left">
              
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#58051E]/10 border border-[#58051E]/20 text-[#58051E] text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-[#58051E]" />
                <span>Premier Higher Education & Schengen Admissions Gateway</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-black tracking-tight text-slate-900 leading-[1.15]">
                Study in <span className="text-[#58051E] underline decoration-[#58051E]/30 decoration-wavy underline-offset-8">Europe</span> with Guaranteed Admission & Visa Support
              </h1>

              <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed max-w-2xl">
                Direct university applications across <strong className="text-slate-900 font-bold">Poland, Germany, Czechia, Italy, Spain & France</strong>. End-to-end NAWA apostille, university wire verification, and VFS mock interview coaching.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => goToLogin('signup')}
                  className="h-13 px-8 rounded-2xl bg-[#58051E] hover:bg-[#430316] text-white text-sm font-black transition-all shadow-xl shadow-[#58051E]/25 flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  Apply for Intake 2026-27 <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => scrollToSection('calculator')}
                  className="h-13 px-6 rounded-2xl bg-white border-2 border-slate-200 hover:border-[#58051E] text-slate-800 hover:text-[#58051E] text-sm font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Calculator className="w-4 h-4 text-[#58051E]" /> Calculate Total Cost
                </button>
              </div>

              {/* Micro Trust Indicators */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200/80">
                <div>
                  <div className="text-2xl font-black text-[#58051E]">45+</div>
                  <div className="text-xs font-bold text-slate-500">Partner EU Universities</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-[#58051E]">100%</div>
                  <div className="text-xs font-bold text-slate-500">NAWA & MEA Legalized</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-[#58051E]">27</div>
                  <div className="text-xs font-bold text-slate-500">Schengen Nations Access</div>
                </div>
              </div>
            </div>

            {/* Right Hero Card Featuring The New Brand Emblem */}
            <div className="lg:col-span-5">
              <div className="relative">
                
                {/* Signature Brand Highlight Card */}
                <div className="rounded-3xl bg-[#58051E] text-white p-8 shadow-2xl border border-white/20 relative overflow-hidden space-y-6">
                  
                  {/* Watermark cap */}
                  <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
                    <FerexVectorMark color="#ffffff" size="xl" />
                  </div>

                  {/* Brand Header */}
                  <div className="flex items-center justify-between border-b border-white/15 pb-5">
                    <Logo variant="white" size="lg" />
                    <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full text-white">
                      Accredited Portal
                    </span>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-serif font-black text-white leading-snug">
                      Your Direct Bridge to Top European Universities
                    </h3>
                    <p className="text-xs text-white/80 leading-relaxed">
                      FEREX Education provides transparent institutional admission processing, fee remittance escrow protection, and local ground support in Warsaw & Krakow.
                    </p>
                  </div>

                  {/* Feature Checklist in Card */}
                  <div className="space-y-2.5 pt-2">
                    {[
                      'Direct University Partner Agreements (No Sub-agents)',
                      'Apostille & NAWA Legalization Guaranteed',
                      'VFS Global Appointment & Mock Consular Coaching',
                      'Airport Welcome & Guaranteed Student Dormitory'
                    ].map((text, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 text-xs font-bold text-white/95">
                        <div className="w-5 h-5 rounded-full bg-emerald-400 text-slate-900 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <span>{text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Button inside Card */}
                  <div className="pt-3">
                    <button
                      onClick={() => goToLogin('signup')}
                      className="w-full h-11 rounded-xl bg-white hover:bg-slate-100 text-[#58051E] text-xs font-black transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Check Eligibility for 2026-27 Intake <ArrowRight className="w-3.5 h-3.5 text-[#58051E]" />
                    </button>
                  </div>
                </div>

                {/* Floating Micro Badge */}
                <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-4 shadow-xl border border-slate-200/80 flex items-center gap-3 max-w-xs hidden sm:flex">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="text-left leading-tight">
                    <span className="text-xs font-black text-slate-900 block">Ministry Certified</span>
                    <span className="text-[10px] font-semibold text-slate-500">Official NAWA & Embassy Compliant</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. SCHENGEN DESTINATION HIGHLIGHTS */}
      <section id="destinations" className="py-20 bg-slate-50/60 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-black uppercase tracking-widest text-[#58051E]">
              European Study Corridors
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-slate-900">
              Top Study Destinations Across Europe
            </h2>
            <p className="text-sm text-slate-600 font-medium">
              Explore leading Schengen member nations with globally accredited bachelor, master, and medicine degrees taught entirely in English.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {destinationStats.slice(0, 6).map((dest) => (
              <div
                key={dest.country}
                className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-[#58051E]/40 hover:shadow-xl transition-all flex flex-col justify-between space-y-6 group text-left"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-4xl">{dest.meta.flag}</span>
                    <span className="text-[10px] font-black px-3 py-1 rounded-full bg-[#58051E]/10 text-[#58051E] border border-[#58051E]/20">
                      {dest.meta.schengen}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-serif font-black text-slate-900 group-hover:text-[#58051E] transition-colors">
                      Study in {dest.country}
                    </h3>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">
                      {dest.count} Accredited Partner Universities
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400 font-semibold">Tuition Starting From:</span>
                      <span className="font-bold text-slate-900">€{dest.minFee.toLocaleString()} / yr</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400 font-semibold">Living Cost:</span>
                      <span className="font-bold text-slate-900">{dest.meta.avgLiving}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400 font-semibold">Post-Study Stay-Back:</span>
                      <span className="font-bold text-emerald-600">{dest.meta.stayBack}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedCountryFilter(dest.country);
                    scrollToSection('universities');
                  }}
                  className="w-full h-10 rounded-xl bg-slate-50 hover:bg-[#58051E] text-slate-700 hover:text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  View {dest.country} Universities <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 5. MULTI-CURRENCY TUITION & LIVING COST CALCULATOR */}
      <section id="calculator" className="py-20 bg-white border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-black uppercase tracking-widest text-[#58051E]">
              100% Transparent Financials
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-slate-900">
              Interactive European Study Cost Estimator
            </h2>
            <p className="text-sm text-slate-600 font-medium">
              Calculate your complete 1st-year budget including university tuition, official NAWA legalization, visa filing fees, and monthly living costs.
            </p>
          </div>

          <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6 md:p-10 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Form Inputs */}
              <div className="lg:col-span-6 space-y-5 text-left">
                
                {/* Destination Selector */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2">
                    Select Target European Country
                  </label>
                  <select
                    value={calcCountry}
                    onChange={(e) => setCalcCountry(e.target.value)}
                    className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#58051E]"
                  >
                    {availableCountries.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* University Selector */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2">
                    Select European Partner University
                  </label>
                  <select
                    value={calcUniId}
                    onChange={(e) => setCalcUniId(e.target.value)}
                    className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#58051E]"
                  >
                    {universitiesInCalcCountry.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.city})</option>
                    ))}
                  </select>
                </div>

                {/* Accommodation Preference */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2">
                    Accommodation Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCalcAccomOption('dorm')}
                      className={`h-11 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        calcAccomOption === 'dorm'
                          ? 'bg-[#58051E] text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      University Dormitory (~€380/mo)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcAccomOption('private')}
                      className={`h-11 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        calcAccomOption === 'private'
                          ? 'bg-[#58051E] text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Private Student Studio (~€550/mo)
                    </button>
                  </div>
                </div>

                {/* Currency Switcher */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2">
                    Display Currency
                  </label>
                  <div className="flex items-center gap-2">
                    {(['EUR', 'INR', 'USD'] as const).map(curr => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => setCalcCurrency(curr)}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          calcCurrency === curr
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {curr === 'EUR' ? '€ EUR' : curr === 'INR' ? '₹ INR' : '$ USD'}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Output Budget Breakdown Card */}
              <div className="lg:col-span-6">
                <div className="rounded-3xl bg-white border border-slate-200 p-6 md:p-8 shadow-md space-y-6 text-left">
                  
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h4 className="text-base font-serif font-black text-slate-900">
                        1st Year Complete Budget Summary
                      </h4>
                      <p className="text-xs text-slate-500 font-semibold">
                        {selectedCalcUni?.name || 'Selected European University'}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[#58051E] bg-[#58051E]/10 px-2.5 py-1 rounded-lg">
                      {calcCurrency}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600 font-medium">Annual University Tuition:</span>
                      <span className="font-bold text-slate-900">{convertCurrency(calcValues.tuitionEUR, calcValues.tuitionINR)}</span>
                    </div>

                    {calcValues.nawaRequired && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-600 font-medium">NAWA & MEA Apostille Legalization:</span>
                        <span className="font-bold text-slate-900">{convertCurrency(calcValues.nawaEUR, calcValues.nawaINR)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600 font-medium">VFS Visa Fee & Consular Insurance:</span>
                      <span className="font-bold text-slate-900">{convertCurrency(calcValues.vfsEUR, calcValues.vfsINR)}</span>
                    </div>

                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600 font-medium">Estimated Annual Living Cost (12 mos):</span>
                      <span className="font-bold text-slate-900">{convertCurrency(calcValues.livingMonthlyEUR * 12, calcValues.livingMonthlyINR * 12)}</span>
                    </div>

                    <div className="pt-4 border-t border-slate-200 flex justify-between items-baseline">
                      <div>
                        <span className="text-xs font-black uppercase text-slate-400 block">Total 1st Year Outlay</span>
                        <span className="text-2xl sm:text-3xl font-serif font-black text-[#58051E]">
                          {convertCurrency(calcValues.totalFirstYearEUR, calcValues.totalFirstYearINR)}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                        Zero Hidden Fees
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => goToLogin('signup', selectedCalcUni?.name)}
                    className="w-full h-11 rounded-xl bg-[#58051E] hover:bg-[#430316] text-white text-xs font-black transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Apply with this Cost Estimate <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 6. PARTNER UNIVERSITIES DIRECTORY */}
      <section id="universities" className="py-20 bg-slate-50/60 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 text-left">
            <div className="space-y-2 max-w-2xl">
              <span className="text-xs font-black uppercase tracking-widest text-[#58051E]">
                Direct Partner Directory
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-black text-slate-900">
                Explore Accredited European Partner Universities
              </h2>
              <p className="text-sm text-slate-600 font-medium">
                Browse verified public and private European institutions with English-medium degree programs and guaranteed offer letter processing.
              </p>
            </div>

            {/* Quick Country Filter Pills */}
            <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 overflow-x-auto">
              {['All', ...availableCountries].map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedCountryFilter(c)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    selectedCountryFilter === c
                      ? 'bg-[#58051E] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search university name, city, or discipline..."
              className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
            />
          </div>

          {/* University Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUniversities.length > 0 ? (
              filteredUniversities.map((uni) => (
                <div
                  key={uni.id}
                  className="bg-white rounded-3xl border border-slate-200 hover:border-[#58051E]/40 hover:shadow-xl transition-all flex flex-col justify-between overflow-hidden group text-left"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#58051E] bg-[#58051E]/10 px-2.5 py-0.5 rounded-full inline-block mb-1.5 border border-[#58051E]/20">
                          {uni.country} 🇪🇺
                        </span>
                        <h3 className="text-base font-serif font-black text-slate-900 group-hover:text-[#58051E] transition-colors leading-tight">
                          {uni.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-semibold mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {uni.city}, {uni.country}
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-semibold">Tuition Range:</span>
                        <span className="font-black text-slate-900">{formatFeeEURandINR(uni.tuition_range || uni.university_fee)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-semibold">Flagship Intakes:</span>
                        <span className="font-bold text-slate-700">{uni.intake || 'Autumn 2026 / Spring 2027'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-semibold">NAWA Legalization:</span>
                        <span className="font-bold text-emerald-600">Supported by FEREX</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    <button
                      onClick={() => goToLogin('signup', uni.name)}
                      className="w-full h-10 rounded-xl bg-[#58051E] hover:bg-[#430316] text-white text-xs font-black transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Apply to {uni.name.split(' ')[0]} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
                <Building2 className="w-10 h-10 text-slate-400 mx-auto" />
                <h4 className="text-base font-bold text-slate-800">No partner universities match your search query</h4>
                <p className="text-xs text-slate-500">Try changing the selected country filter or search term.</p>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* 7. STEP-BY-STEP ADMISSIONS & VISA ROADMAP */}
      <section id="roadmap" className="py-20 bg-white border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-black uppercase tracking-widest text-[#58051E]">
              From Application to Campus Arrival
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-slate-900">
              The 7-Stage Schengen Admissions Journey
            </h2>
            <p className="text-sm text-slate-600 font-medium">
              FEREX manages every stage of your European study trajectory with real-time portal tracking, document legalization, and consular mock interviews.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {roadmapSteps.slice(0, 4).map((step) => (
              <div
                key={step.num}
                className="bg-slate-50 rounded-3xl p-6 border border-slate-200 hover:border-[#58051E]/40 hover:shadow-lg transition-all space-y-4"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#58051E] text-white font-black text-sm flex items-center justify-center shadow-sm">
                  0{step.num}
                </div>
                <h4 className="text-base font-serif font-black text-slate-900">
                  {step.title}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {roadmapSteps.slice(4).map((step) => (
              <div
                key={step.num}
                className="bg-slate-50 rounded-3xl p-6 border border-slate-200 hover:border-[#58051E]/40 hover:shadow-lg transition-all space-y-4"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#58051E] text-white font-black text-sm flex items-center justify-center shadow-sm">
                  0{step.num}
                </div>
                <h4 className="text-base font-serif font-black text-slate-900">
                  {step.title}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 8. ADMISSIONS FAQ ACCORDION */}
      <section id="faq" className="py-20 bg-slate-50/60 border-b border-slate-200/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="text-center space-y-3">
            <span className="text-xs font-black uppercase tracking-widest text-[#58051E]">
              Got Questions?
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-slate-900">
              Frequently Asked Admissions Questions
            </h2>
            <p className="text-sm text-slate-600 font-medium">
              Everything you need to know about European university eligibility, fees, NAWA authentication, and visa procedures.
            </p>
          </div>

          <div className="space-y-3 text-left">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-slate-900 hover:text-[#58051E] transition-colors cursor-pointer text-sm"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${activeFaq === idx ? 'rotate-180 text-[#58051E]' : ''}`} />
                </button>
                {activeFaq === idx && (
                  <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed font-medium border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 9. BOTTOM CALL TO ACTION BANNER */}
      <section className="py-16 bg-[#58051E] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <Logo variant="white" size="lg" className="mx-auto" />
          <h2 className="text-3xl sm:text-4xl font-serif font-black text-white leading-tight">
            Ready to Begin Your European Higher Education Journey?
          </h2>
          <p className="text-sm text-white/80 max-w-2xl mx-auto font-medium">
            Create your free student account now to upload your transcripts, unlock guaranteed university offer letters, and track your NAWA & VFS visa filing in real-time.
          </p>
          <div className="pt-2">
            <button
              onClick={() => goToLogin('signup')}
              className="h-13 px-8 rounded-2xl bg-white hover:bg-slate-100 text-[#58051E] text-sm font-black transition-all shadow-xl flex items-center gap-2 mx-auto cursor-pointer"
            >
              Start Free Application Today <ArrowRight className="w-4 h-4 text-[#58051E]" />
            </button>
          </div>
        </div>
      </section>

      {/* 10. CLEAN FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-12 text-slate-600 text-xs text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 pb-8 border-b border-slate-100">
            
            <div className="space-y-3">
              <Logo size="sm" />
              <p className="text-slate-500 font-medium leading-relaxed">
                FEREX Global Education is the official European higher education admissions division of Santoge Technologies.
              </p>
            </div>

            <div className="space-y-2">
              <h5 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">European Headquarters</h5>
              <p className="text-slate-500 font-medium leading-relaxed">
                Al. Jerozolimskie 81, 02-001<br />
                Warsaw, Republic of Poland 🇵🇱<br />
                Tel: +48 22 890 1234
              </p>
            </div>

            <div className="space-y-2">
              <h5 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">India Admissions Center</h5>
              <p className="text-slate-500 font-medium leading-relaxed">
                Bandra-Kurla Complex (BKC)<br />
                Mumbai, Maharashtra, India 🇮🇳<br />
                Email: admissions@ferex.education
              </p>
            </div>

            <div className="space-y-2">
              <h5 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">Group Portals</h5>
              <div className="space-y-1 font-semibold text-slate-700">
                <a href="/login" className="block hover:text-[#58051E]">Ferex Education Portal</a>
                <a href="/trade/dashboard" className="block hover:text-[#58051E]">Global Trade ERP</a>
                <a href="/rimi/dashboard" className="block hover:text-[#58051E]">Rimi Frozen FMCG</a>
                <a href="/digital/dashboard" className="block hover:text-[#58051E]">Ferex Digital Agency</a>
              </div>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400 font-medium">
            <span>© {new Date().getFullYear()} FEREX Education Group. All rights reserved.</span>
            <div className="flex items-center gap-6">
              <a href="#destinations" className="hover:text-slate-700">Privacy Policy</a>
              <a href="#destinations" className="hover:text-slate-700">Terms of Admission</a>
              <a href="#destinations" className="hover:text-slate-700">NAWA Verification</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};
