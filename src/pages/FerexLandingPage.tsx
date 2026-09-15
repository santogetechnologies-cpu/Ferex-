import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2, ArrowRight, LogIn, LogOut, ChevronDown, MapPin,
  User, Calculator, Search, Check, ArrowUpRight,
  Clock, Briefcase, Globe, Star, X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUniversities } from '../hooks/useUniversities';
import { useDestinations } from '../hooks/useDestinations';
import { getDashboardRoute } from '../lib/roleRouter';
import type { University } from '../lib/types';
import { Logo } from '../components/Logo';

// Student images provided by the user
import heroStudentGirl from '../assets/hero-student-girl.jpg';
import aboutStudentsCampus from '../assets/about-students-campus.jpg';

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
  UK: { flag: '🇬🇧', schengen: 'Graduate Route Visa', workRights: '20 hrs/week Term-time', stayBack: '24 Months Graduate Route', avgLiving: '£1,000 - £1,400 / mo' },
  'United Kingdom': { flag: '🇬🇧', schengen: 'Graduate Route Visa', workRights: '20 hrs/week Term-time', stayBack: '24 Months Graduate Route', avgLiving: '£1,000 - £1,400 / mo' },
  Canada: { flag: '🇨🇦', schengen: 'PGWP Eligible', workRights: '24 hrs/week Off-campus', stayBack: 'Up to 3 Years PGWP', avgLiving: 'CAD $1,100 - $1,500 / mo' },
  Switzerland: { flag: '🇨🇭', schengen: 'Schengen Area', workRights: '15 hrs/week Part-time', stayBack: '6 Months Job Search Permit', avgLiving: 'CHF 1,400 - 1,800 / mo' },
  'Czech Republic': { flag: '🇨🇿', schengen: '27 Schengen Nations', workRights: 'Free Labor Market for Graduates', stayBack: '9 Months Job Seeking Visa', avgLiving: '€400 - €650 / mo' },
  Italy: { flag: '🇮🇹', schengen: '27 Schengen Nations', workRights: '20 hrs/week Legal Work', stayBack: '12 Months Permit to Stay', avgLiving: '€500 - €750 / mo' },
  Spain: { flag: '🇪🇸', schengen: '27 Schengen Nations', workRights: '30 hrs/week Part-time', stayBack: '12 Months Job Search Residence', avgLiving: '€550 - €800 / mo' },
  France: { flag: '🇫🇷', schengen: '27 Schengen Nations', workRights: '60% of Annual Legal Hours', stayBack: '12-24 Months APS Visa', avgLiving: '€700 - €1,000 / mo' },
  Lithuania: { flag: '🇱🇹', schengen: '27 Schengen Nations', workRights: '20 hrs/week during studies', stayBack: '12 Months TRC Extension', avgLiving: '€350 - €500 / mo' },
  Hungary: { flag: '🇭🇺', schengen: '27 Schengen Nations', workRights: '24 hrs/week Part-time', stayBack: '9 Months Study-to-Work Permit', avgLiving: '€400 - €550 / mo' },
  Austria: { flag: '🇦🇹', schengen: '27 Schengen Nations', workRights: '20 hrs/week with permit', stayBack: '12 Months Red-White-Red Card', avgLiving: '€800 - €1,100 / mo' },
  Netherlands: { flag: '🇳🇱', schengen: '27 Schengen Nations', workRights: '16 hrs/week Part-time', stayBack: '12 Months Orientation Year', avgLiving: '€900 - €1,300 / mo' },
  Ireland: { flag: '🇮🇪', schengen: 'European Union', workRights: '20 hrs/week Term-time', stayBack: '24 Months Third Level Scheme', avgLiving: '€900 - €1,300 / mo' },
  USA: { flag: '🇺🇸', schengen: 'F-1 OPT Approved', workRights: '20 hrs/week On-campus', stayBack: '12-36 Months STEM OPT', avgLiving: '$1,200 - $1,800 / mo' },
  'United States': { flag: '🇺🇸', schengen: 'F-1 OPT Approved', workRights: '20 hrs/week On-campus', stayBack: '12-36 Months STEM OPT', avgLiving: '$1,200 - $1,800 / mo' },
  Australia: { flag: '🇦🇺', schengen: 'Subclass 500', workRights: '48 hrs/fortnight', stayBack: '2-4 Years Post-Study Work', avgLiving: 'AUD $1,400 - $1,900 / mo' },
};

export const FerexLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, session, profile, signOut } = useAuth();
  const { universities } = useUniversities();
  const { destinations } = useDestinations();

  // State
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [isMissionModalOpen, setIsMissionModalOpen] = useState<boolean>(false);

  // Fee Calculator State
  const availableCountries = useMemo(() => {
    const set = new Set<string>();
    destinations.forEach(d => {
      if (d.name && d.name.toLowerCase().trim() !== 'india') set.add(d.name.trim());
    });
    universities.forEach(u => {
      if (u.country && u.country.toLowerCase().trim() !== 'india') set.add(u.country.trim());
    });
    return Array.from(set);
  }, [destinations, universities]);

  const [calcCountry, setCalcCountry] = useState<string>(availableCountries[0] || '');

  React.useEffect(() => {
    if (availableCountries.length > 0 && !availableCountries.some(c => c.toLowerCase() === calcCountry.toLowerCase())) {
      setCalcCountry(availableCountries[0]);
    }
  }, [availableCountries, calcCountry]);

  const universitiesInCalcCountry = useMemo(() => {
    return universities.filter(u => u.country?.trim().toLowerCase() === calcCountry.trim().toLowerCase());
  }, [universities, calcCountry]);

  const [calcUniId, setCalcUniId] = useState<string>('');

  React.useEffect(() => {
    console.log('[Cost Calculator] Universities in country:', universitiesInCalcCountry.length);
    if (universitiesInCalcCountry.length > 0) {
      const currentUniValid = universitiesInCalcCountry.some(u => u.id === calcUniId);
      if (!currentUniValid) {
        const firstUni = universitiesInCalcCountry[0];
        console.log('[Cost Calculator] Setting to first uni:', firstUni.name);
        setCalcUniId(firstUni.id);
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
      navigate(getDashboardRoute(role, user.email));
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
    const list = universities.filter(u => {
      const matchCountry = selectedCountryFilter === 'All' || u.country?.toLowerCase() === selectedCountryFilter.toLowerCase();
      const matchCat = activeCategory === 'All' || u.category?.toLowerCase() === activeCategory.toLowerCase() || (u.programs && u.programs.some(p => p.toLowerCase().includes(activeCategory.toLowerCase())));
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || u.name?.toLowerCase().includes(q) || u.city?.toLowerCase().includes(q) || u.country?.toLowerCase().includes(q);
      return matchCountry && matchCat && matchSearch;
    });
    return list;
  }, [universities, selectedCountryFilter, activeCategory, searchQuery]);

  // Destination country statistics
  const destinationStats = useMemo(() => {
    const map = new Map<string, { count: number; unis: University[]; minFee: number }>();
    
    // Seed registered destinations
    destinations.forEach(d => {
      if (d.name && d.name.toLowerCase().trim() !== 'india') {
        map.set(d.name.trim(), { count: 0, unis: [], minFee: 3000 });
      }
    });

    universities.forEach(u => {
      if (!u.country || u.country.toLowerCase().trim() === 'india') return;
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

    return Array.from(map.entries()).map(([country, data]) => {
      const destObj = destinations.find(d => d.name.toLowerCase() === country.toLowerCase());
      const fallbackFlag = destObj?.flag && destObj.flag !== 'EU' && destObj.flag !== '🌍' ? destObj.flag : '🇪🇺';
      return {
        country,
        count: data.count,
        minFee: data.minFee === 99999 ? 3000 : data.minFee,
        meta: COUNTRY_DETAILS[country] || {
          flag: fallbackFlag,
          schengen: destObj?.badge || 'Schengen Member',
          workRights: '20 hrs/week legal',
          stayBack: destObj?.processing ? `${destObj.processing} processing` : '12 Months Post-Study',
          avgLiving: '€400 - €600 / mo'
        }
      };
    });
  }, [universities, destinations]);

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

    const legalizationRequired = selectedCalcUni?.nawa_required !== false && Boolean(selectedCalcUni?.country);
    const legalizationEUR = legalizationRequired ? 250 : 0;
    const vfsEUR = 165;
    const agencyEUR = 280;
    const monthlyLivingEUR = calcAccomOption === 'dorm' ? 380 : 550;
    const annualLivingEUR = monthlyLivingEUR * 12;

    const totalFirstYearEUR = tuitionEUR + legalizationEUR + vfsEUR + agencyEUR + annualLivingEUR;

    return {
      tuitionEUR,
      tuitionINR: tuitionEUR * 90,
      legalizationEUR,
      legalizationINR: legalizationEUR * 90,
      vfsEUR,
      vfsINR: vfsEUR * 90,
      agencyEUR,
      agencyINR: agencyEUR * 90,
      livingMonthlyEUR: monthlyLivingEUR,
      livingMonthlyINR: monthlyLivingEUR * 90,
      totalFirstYearEUR,
      totalFirstYearINR: totalFirstYearEUR * 90,
      legalizationRequired,
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
    { num: 3, title: 'Official Offer Letter Release', desc: 'Receipt of unconditional admission offer letter from partner universities issued directly within 7 to 14 business days.' },
    { num: 4, title: 'Tuition Wire Clearance & Receipt', desc: 'Safe, zero-markup tuition deposit wire to university bank account with official payment confirmation voucher generated.' },
    { num: 5, title: 'Government & MEA Apostille Legalization', desc: 'Complete government authentication of high school/bachelor degrees for Ministry equivalency validation.' },
    { num: 6, title: 'VFS Global Filing & Visa Coaching', desc: 'Appointment booking at VFS visa centers with personalized dossier compilation, financial sponsor proof, and consular mock coaching.' },
    { num: 7, title: 'Schengen Arrival & Dorm Check-in', desc: 'Airport pickup in Warsaw/Krakow/Berlin, student dormitory check-in, TRC residence permit filing, and SIM/bank account setup.' },
  ];

  const faqs = [
    { q: 'What are the main intake seasons for European Universities?', a: 'European universities primarily operate two major intake cycles: Autumn Intake (September/October) and Spring Intake (February/March). Autumn is the flagship intake offering all bachelor, master, and doctoral programs.' },
    { q: 'Is IELTS or TOEFL mandatory for admission in Poland and Germany?', a: 'Many of our partner universities accept Medium of Instruction (MOI) certificates from your previous high school or college, or conduct their own internal English proficiency interview, allowing you to secure admission without mandatory IELTS.' },
    { q: 'What is Academic Legalization and why is it needed?', a: 'National Academic Recognition authorities verify foreign educational certificates to confirm they meet official higher education standards. FEREX manages the entire legalization and apostille chain end-to-end on your behalf.' },
    { q: 'Can students work legally while studying in Europe?', a: 'Yes! International students in Schengen countries (like Poland, Germany, Czechia) have legal part-time work rights (typically 20 hours/week during semesters and full-time during holidays) with generous 9-18 months post-study stay-back visas.' },
    { q: 'What is the total estimated annual cost for tuition and living in Poland?', a: 'Tuition fees at reputable public and private universities range between €2,500 - €4,500 per year (~₹2.2L - ₹4.0L/yr). Monthly student living expenses including dormitory accommodation, food, and transport average €350 - €500 (~₹31k - ₹45k/mo).' },
  ];

  const testimonials = [
    {
      name: 'Aarav Patel',
      course: 'B.Sc. Computer Science',
      uni: 'Warsaw University of Technology, Poland',
      intake: 'Autumn Intake 2025',
      rating: 5,
      comment: 'FEREX took care of my application, academic legalization recognition, and VFS visa appointment smoothly. Got my visa stamped on the very first attempt!'
    },
    {
      name: 'Ananya Sharma',
      course: 'M.Sc. International Business',
      uni: 'Vistula University, Warsaw',
      intake: 'Spring Intake 2026',
      rating: 5,
      comment: 'The transparency with fees and direct bank wire confirmation gave my parents complete peace of mind. Now happily settled in Warsaw!'
    },
    {
      name: 'Rohan Deshmukh',
      course: 'B.Eng. Mechanical Engineering',
      uni: 'Berlin International University, Germany',
      intake: 'Autumn Intake 2025',
      rating: 5,
      comment: 'The consular mock interview coaching was incredible. The questions they practiced with me were almost identical to what the visa officer asked.'
    }
  ];

  return (
    <div className="min-h-screen bg-white text-[#1F2937] font-sans selection:bg-[#570229] selection:text-white">
      
      {/* 1. TOP ANNOUNCEMENT BANNER */}
      <div className="bg-[#570229] text-white py-2 px-4 text-xs font-semibold">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-[#F59E0B] text-slate-900 text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full">
              Admissions Open
            </span>
            <span className="text-white/95 font-medium">
              Autumn 2026 & Spring 2027 European University Intakes are now accepting applications!
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="hidden md:inline text-white/80">Guaranteed Offer Letters within 7–14 Days</span>
            <button
              onClick={() => goToLogin('signup')}
              className="text-[#F59E0B] hover:text-white font-bold underline flex items-center gap-1 cursor-pointer transition-colors"
            >
              Start Free Application <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. STICKY FROSTED NAVIGATION HEADER */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#ECE7EA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          
          {/* Brand Logo */}
          <div className="cursor-pointer" onClick={() => navigate('/')}>
            <Logo size="md" variant="full" color="#570229" />
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-bold text-[#6B7280]">
            <button onClick={() => scrollToSection('about')} className="hover:text-[#570229] transition-colors cursor-pointer">
              About Ferex
            </button>
            <button onClick={() => scrollToSection('destinations')} className="hover:text-[#570229] transition-colors cursor-pointer">
              Schengen Destinations
            </button>
            <button onClick={() => scrollToSection('calculator')} className="hover:text-[#570229] transition-colors cursor-pointer">
              Cost Calculator
            </button>
            <button onClick={() => scrollToSection('universities')} className="hover:text-[#570229] transition-colors cursor-pointer">
              Partner Universities
            </button>
            <button onClick={() => scrollToSection('roadmap')} className="hover:text-[#570229] transition-colors cursor-pointer">
              Admissions Roadmap
            </button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-[#570229] transition-colors cursor-pointer">
              FAQ
            </button>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {session && user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAuthAction}
                  className="h-10 px-4 rounded-xl bg-[#570229] text-white text-xs font-bold hover:bg-[#6F0335] transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" /> Dashboard
                </button>
                <button
                  onClick={handleSignOut}
                  className="h-10 px-3 rounded-xl border border-[#ECE7EA] text-[#6B7280] hover:bg-[#F7F4F2] text-xs font-bold transition-all cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => goToLogin('signin')}
                  className="h-10 px-4 rounded-xl text-xs font-bold text-[#1F2937] hover:text-[#570229] hover:bg-[#F7F4F2] transition-all cursor-pointer flex items-center gap-1.5 border border-[#ECE7EA]"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#570229]" /> Portal Login
                </button>
                <button
                  onClick={() => goToLogin('signup')}
                  className="h-10 px-5 rounded-xl bg-[#570229] text-white text-xs font-black hover:bg-[#6F0335] transition-all shadow-md shadow-[#570229]/20 flex items-center gap-1.5 active:scale-98 cursor-pointer"
                >
                  Apply Online <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION (MINIMAL, COMPACT, PURE WHITE CANVAS, SEAMLESS IMAGE BLEND) */}
      <section className="relative bg-white py-6 lg:py-10 border-b border-[#ECE7EA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">
            
            {/* Left Column: Headlines, Subtitle, CTAs & Metrics */}
            <div className="lg:col-span-6 space-y-5 text-left">
              
              {/* Main Headline (Clean, no wavy underline) */}
              <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-serif font-black tracking-tight text-[#1F2937] leading-[1.16]">
                Study in <span className="text-[#570229]">Europe</span> with Guaranteed Admission & Visa Support
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-base text-[#6B7280] font-normal leading-relaxed max-w-lg">
                Direct university applications across <strong className="text-[#1F2937] font-bold">Poland, Germany, Czechia, Italy, Spain & France</strong>. End-to-end government academic apostille, university wire verification, and 1-on-1 consular visa mock interviews.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <button
                  onClick={() => goToLogin('signup')}
                  className="h-12 px-7 rounded-xl bg-[#570229] hover:bg-[#6F0335] text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-[#570229]/20 flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  Apply for Intake 2026-27 <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => scrollToSection('calculator')}
                  className="h-12 px-5 rounded-xl bg-white border border-[#ECE7EA] hover:border-[#570229] text-[#1F2937] hover:text-[#570229] text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Calculator className="w-4 h-4 text-[#570229]" /> Calculate Total Cost
                </button>
              </div>

              {/* Micro Trust Indicators Bar */}
              <div className="grid grid-cols-3 gap-4 pt-5 border-t border-[#ECE7EA]">
                <div>
                  <div className="text-xl sm:text-2xl font-black text-[#570229]">45+</div>
                  <div className="text-[11px] font-bold text-[#6B7280]">Partner EU Universities</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-[#570229]">100%</div>
                  <div className="text-[11px] font-bold text-[#6B7280]">Govt & MEA Legalized</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-[#570229]">27</div>
                  <div className="text-[11px] font-bold text-[#6B7280]">Schengen Nations</div>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Girl Student Image (Seamless Blend onto White, No Card Border/Shadow) */}
            <div className="lg:col-span-6 flex justify-center lg:justify-end">
              <div className="w-full max-w-[480px]">
                <img
                  src={heroStudentGirl}
                  alt="European University Student - FEREX Education"
                  className="w-full h-auto object-contain block select-none pointer-events-none"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. ABOUT US SECTION (MATCHING USER'S ATTACHED SCREENSHOT MODEL WITH SEAMLESS IMAGE BLEND) */}
      <section id="about" className="py-16 lg:py-20 bg-white border-b border-[#ECE7EA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          {/* Main 3-Column Layout: Left Text, Center Campus Image, Right Feature List */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
            
            {/* Left Column: Headline, Description & Our Mission CTA */}
            <div className="lg:col-span-4 space-y-5 text-left">
              <div className="space-y-1.5">
                <span className="text-xs font-black uppercase tracking-widest text-[#8C1D4F] block">
                  ABOUT FEREX
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-serif font-black text-[#1F2937] leading-[1.18]">
                  Empowering Learners, Building Better Futures
                </h2>
              </div>

              <p className="text-sm text-[#6B7280] font-normal leading-relaxed">
                At Ferex Education, we believe that education is more than just learning — it’s a journey of self-discovery, skill-building and endless possibilities.
              </p>

              <div>
                <button
                  onClick={() => setIsMissionModalOpen(true)}
                  className="h-11 px-7 rounded-full bg-[#570229] hover:bg-[#6F0335] text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#570229]/20 inline-flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  Our Mission <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Center Column: 4 Students Campus Image (Seamless Blend, No Card Frame) */}
            <div className="lg:col-span-4 flex justify-center">
              <div className="w-full max-w-[340px]">
                <img
                  src={aboutStudentsCampus}
                  alt="Students walking on European university campus"
                  className="w-full h-auto object-contain block select-none pointer-events-none"
                />
              </div>
            </div>

            {/* Right Column: 4 Feature Items with Circular Badges */}
            <div className="lg:col-span-4 space-y-5 text-left">
              
              {/* Feature 1: Expert Instructors */}
              <div className="flex items-center gap-3.5 group">
                <div className="w-12 h-12 rounded-full bg-[#F7F4F2] border border-[#ECE7EA] group-hover:bg-[#E9D7DF] text-[#570229] flex items-center justify-center shrink-0 transition-colors">
                  <User className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-[#1F2937] leading-tight">
                    Expert Instructors
                  </h4>
                  <p className="text-xs text-[#6B7280] font-medium mt-0.5">
                    Learn from industry professionals
                  </p>
                </div>
              </div>

              {/* Feature 2: Flexible Learning */}
              <div className="flex items-center gap-3.5 group">
                <div className="w-12 h-12 rounded-full bg-[#F7F4F2] border border-[#ECE7EA] group-hover:bg-[#E9D7DF] text-[#570229] flex items-center justify-center shrink-0 transition-colors">
                  <Clock className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-[#1F2937] leading-tight">
                    Flexible Learning
                  </h4>
                  <p className="text-xs text-[#6B7280] font-medium mt-0.5">
                    Study at your own pace
                  </p>
                </div>
              </div>

              {/* Feature 3: Career Support */}
              <div className="flex items-center gap-3.5 group">
                <div className="w-12 h-12 rounded-full bg-[#F7F4F2] border border-[#ECE7EA] group-hover:bg-[#E9D7DF] text-[#570229] flex items-center justify-center shrink-0 transition-colors">
                  <Briefcase className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-[#1F2937] leading-tight">
                    Career Support
                  </h4>
                  <p className="text-xs text-[#6B7280] font-medium mt-0.5">
                    Get placed with top companies
                  </p>
                </div>
              </div>

              {/* Feature 4: Global Community */}
              <div className="flex items-center gap-3.5 group">
                <div className="w-12 h-12 rounded-full bg-[#F7F4F2] border border-[#ECE7EA] group-hover:bg-[#E9D7DF] text-[#570229] flex items-center justify-center shrink-0 transition-colors">
                  <Globe className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-[#1F2937] leading-tight">
                    Global Community
                  </h4>
                  <p className="text-xs text-[#6B7280] font-medium mt-0.5">
                    Connect. Learn. Grow.
                  </p>
                </div>
              </div>

            </div>

          </div>

          {/* Bottom Card (As shown in attached screenshot): "A trusted education partner for 10,000+ students worldwide" */}
          <div className="bg-[#F7F4F2] rounded-2xl border border-[#ECE7EA] p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left space-y-1">
              <span className="text-xs sm:text-sm font-semibold text-[#6B7280] block">
                A trusted education partner for
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-serif font-black text-[#570229]">
                  10,000+
                </span>
                <span className="text-sm sm:text-base font-bold text-[#1F2937]">
                  students worldwide
                </span>
              </div>
            </div>

            <button
              onClick={() => scrollToSection('universities')}
              className="w-11 h-11 rounded-full bg-white border border-[#ECE7EA] hover:bg-[#570229] hover:text-white text-[#570229] flex items-center justify-center shadow-xs transition-all cursor-pointer group shrink-0"
              title="Explore Partner Universities"
            >
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

        </div>
      </section>

      {/* 5. SCHENGEN DESTINATION HIGHLIGHTS */}
      <section id="destinations" className="py-16 lg:py-20 bg-white border-b border-[#ECE7EA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-[#8C1D4F]">
              European Study Corridors
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#1F2937]">
              Top Study Destinations Across Europe
            </h2>
            <p className="text-sm text-[#6B7280] font-medium">
              Explore leading Schengen member nations with globally accredited bachelor, master, and medicine degrees taught entirely in English.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {destinationStats.slice(0, 6).map((dest) => (
              <div
                key={dest.country}
                className="bg-white rounded-2xl p-6 border border-[#ECE7EA] hover:border-[#570229]/40 hover:shadow-lg transition-all flex flex-col justify-between space-y-6 group text-left"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{dest.meta.flag}</span>
                    <span className="text-[10px] font-black px-3 py-1 rounded-full bg-[#E9D7DF] text-[#570229] border border-[#C85A7C]/20">
                      {dest.meta.schengen}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-serif font-black text-[#1F2937] group-hover:text-[#570229] transition-colors">
                      Study in {dest.country}
                    </h3>
                    <p className="text-xs text-[#6B7280] font-bold mt-0.5">
                      {dest.count} Accredited Partner Universities
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#ECE7EA] text-xs">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[#6B7280] font-semibold">Tuition Starting From:</span>
                      <span className="font-bold text-[#1F2937]">€{dest.minFee.toLocaleString()} / yr</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[#6B7280] font-semibold">Monthly Living Cost:</span>
                      <span className="font-bold text-[#1F2937]">{dest.meta.avgLiving}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[#6B7280] font-semibold">Post-Study Stay-Back:</span>
                      <span className="font-bold text-[#0F9D58]">{dest.meta.stayBack}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedCountryFilter(dest.country);
                    scrollToSection('universities');
                  }}
                  className="w-full h-10 rounded-xl bg-[#F7F4F2] hover:bg-[#570229] text-[#1F2937] hover:text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  View {dest.country} Universities <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 6. MULTI-CURRENCY TUITION & LIVING COST CALCULATOR */}
      <section id="calculator" className="py-16 lg:py-20 bg-white border-b border-[#ECE7EA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-[#8C1D4F]">
              100% Transparent Financials
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#1F2937]">
              Interactive European Study Cost Estimator
            </h2>
            <p className="text-sm text-[#6B7280] font-medium">
              Calculate your complete 1st-year budget including university tuition, official academic legalization, visa filing fees, and monthly living costs.
            </p>
          </div>

          <div className="bg-[#F7F4F2] rounded-3xl border border-[#ECE7EA] p-6 md:p-9 shadow-xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Form Inputs */}
              <div className="lg:col-span-6 space-y-4 text-left">
                
                {/* Destination Selector */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#6B7280] mb-1.5">
                    Select Target European Country
                  </label>
                  <select
                    value={calcCountry}
                    onChange={(e) => setCalcCountry(e.target.value)}
                    className="w-full h-11 px-3.5 bg-white border border-[#ECE7EA] rounded-xl text-xs font-bold text-[#1F2937] focus:outline-none focus:border-[#570229]"
                  >
                    {availableCountries.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* University Selector */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#6B7280] mb-1.5">
                    Select European Partner University
                  </label>
                  {universitiesInCalcCountry.length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-left">
                      <p className="text-xs text-amber-800 font-bold">
                        No universities available for {calcCountry || 'this country'}.
                      </p>
                    </div>
                  ) : (
                    <select
                      value={calcUniId}
                      onChange={(e) => setCalcUniId(e.target.value)}
                      className="w-full h-11 px-3.5 bg-white border border-[#ECE7EA] rounded-xl text-xs font-bold text-[#1F2937] focus:outline-none focus:border-[#570229]"
                    >
                      {universitiesInCalcCountry.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.city || u.country})</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Accommodation Preference */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#6B7280] mb-1.5">
                    Accommodation Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCalcAccomOption('dorm')}
                      className={`h-11 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        calcAccomOption === 'dorm'
                          ? 'bg-[#570229] text-white shadow-xs'
                          : 'bg-white border border-[#ECE7EA] text-[#1F2937] hover:bg-[#F7F4F2]'
                      }`}
                    >
                      University Dorm (~€380/mo)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcAccomOption('private')}
                      className={`h-11 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        calcAccomOption === 'private'
                          ? 'bg-[#570229] text-white shadow-xs'
                          : 'bg-white border border-[#ECE7EA] text-[#1F2937] hover:bg-[#F7F4F2]'
                      }`}
                    >
                      Private Studio (~€550/mo)
                    </button>
                  </div>
                </div>

                {/* Currency Switcher */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#6B7280] mb-1.5">
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
                            ? 'bg-[#570229] text-white shadow-xs'
                            : 'bg-white border border-[#ECE7EA] text-[#6B7280] hover:bg-slate-50'
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
                <div className="rounded-2xl bg-white border border-[#ECE7EA] p-6 sm:p-7 shadow-xs space-y-5 text-left">
                  
                  <div className="flex items-center justify-between border-b border-[#ECE7EA] pb-3.5">
                    <div>
                      <h4 className="text-base font-serif font-black text-[#1F2937]">
                        1st Year Complete Budget Summary
                      </h4>
                      <p className="text-xs text-[#6B7280] font-semibold">
                        {selectedCalcUni?.name || 'Selected European University'}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[#570229] bg-[#E9D7DF] px-2.5 py-1 rounded-lg">
                      {calcCurrency}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-[#6B7280] font-medium">Annual University Tuition:</span>
                      <span className="font-bold text-[#1F2937]">{convertCurrency(calcValues.tuitionEUR, calcValues.tuitionINR)}</span>
                    </div>

                    {calcValues.legalizationRequired && (
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-[#6B7280] font-medium">Government & MEA Apostille Legalization:</span>
                        <span className="font-bold text-[#1F2937]">{convertCurrency(calcValues.legalizationEUR, calcValues.legalizationINR)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-[#6B7280] font-medium">VFS Visa Fee & Consular Insurance:</span>
                      <span className="font-bold text-[#1F2937]">{convertCurrency(calcValues.vfsEUR, calcValues.vfsINR)}</span>
                    </div>

                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-[#6B7280] font-medium">Estimated Annual Living Cost (12 mos):</span>
                      <span className="font-bold text-[#1F2937]">{convertCurrency(calcValues.livingMonthlyEUR * 12, calcValues.livingMonthlyINR * 12)}</span>
                    </div>

                    <div className="pt-3.5 border-t border-[#ECE7EA] flex justify-between items-baseline">
                      <div>
                        <span className="text-xs font-black uppercase text-[#6B7280] block">Total 1st Year Outlay</span>
                        <span className="text-2xl sm:text-3xl font-serif font-black text-[#570229]">
                          {convertCurrency(calcValues.totalFirstYearEUR, calcValues.totalFirstYearINR)}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-[#0F9D58] bg-[#0F9D58]/10 px-2 py-1 rounded-md border border-[#0F9D58]/20">
                        Zero Hidden Fees
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => goToLogin('signup', selectedCalcUni?.name)}
                    className="w-full h-11 rounded-xl bg-[#570229] hover:bg-[#6F0335] text-white text-xs font-black transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Apply with this Cost Estimate <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 7. PARTNER UNIVERSITIES DIRECTORY */}
      <section id="universities" className="py-16 lg:py-20 bg-white border-b border-[#ECE7EA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 text-left">
            <div className="space-y-1.5 max-w-2xl">
              <span className="text-xs font-black uppercase tracking-widest text-[#8C1D4F]">
                Direct Partner Directory
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#1F2937]">
                Explore Accredited European Partner Universities
              </h2>
              <p className="text-sm text-[#6B7280] font-medium">
                Browse verified public and private European institutions with English-medium degree programs and guaranteed offer letter processing.
              </p>
            </div>

            {/* Quick Country Filter Pills */}
            <div className="flex items-center gap-1.5 bg-[#F7F4F2] p-1.5 rounded-2xl border border-[#ECE7EA] overflow-x-auto">
              {['All', ...availableCountries].map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedCountryFilter(c)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    selectedCountryFilter === c
                      ? 'bg-[#570229] text-white shadow-xs'
                      : 'text-[#6B7280] hover:text-[#1F2937] hover:bg-white'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search university name, city, or discipline..."
              className="w-full h-11 pl-10 pr-4 bg-white border border-[#ECE7EA] rounded-xl text-xs font-semibold text-[#1F2937] focus:outline-none focus:border-[#570229]"
            />
          </div>

          {/* University Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUniversities.length > 0 ? (
              filteredUniversities.map((uni) => (
                <div
                  key={uni.id}
                  className="bg-white rounded-2xl border border-[#ECE7EA] hover:border-[#570229]/40 hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden group text-left"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#570229] bg-[#E9D7DF] px-2.5 py-0.5 rounded-full inline-block mb-1.5 border border-[#C85A7C]/20">
                          {uni.country}
                        </span>
                        <h3 className="text-base font-serif font-black text-[#1F2937] group-hover:text-[#570229] transition-colors leading-tight">
                          {uni.name}
                        </h3>
                        <p className="text-xs text-[#6B7280] font-semibold mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#6B7280] shrink-0" /> {uni.city}, {uni.country}
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#F7F4F2] border border-[#ECE7EA] space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-[#6B7280] font-semibold">Tuition Range:</span>
                        <span className="font-black text-[#1F2937]">{formatFeeEURandINR(uni.tuition_range || uni.university_fee)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#6B7280] font-semibold">Flagship Intakes:</span>
                        <span className="font-bold text-[#1F2937]">
                          {Array.isArray(uni.intakes) ? uni.intakes.join(' • ') : (uni.intakes || (uni as any).intake || 'October 2026 • February 2027')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#6B7280] font-semibold">Legalization & Visa:</span>
                        <span className="font-bold text-[#0F9D58]">Supported by FEREX</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    <button
                      onClick={() => goToLogin('signup', uni.name)}
                      className="w-full h-10 rounded-xl bg-[#570229] hover:bg-[#6F0335] text-white text-xs font-black transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Apply to {uni.name.split(' ')[0]} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-[#ECE7EA] p-8 space-y-4">
                <Building2 className="w-10 h-10 text-[#6B7280] mx-auto" />
                <h4 className="text-base font-bold text-[#1F2937]">No partner universities match your filter criteria</h4>
                <p className="text-xs text-[#6B7280]">
                  {universities.length > 0 
                    ? `${universities.length} universities are loaded in the database, but none match current filters (Country: ${selectedCountryFilter} | Category: ${activeCategory} | Search: "${searchQuery || 'None'}").`
                    : 'No universities currently active in the database.'}
                </p>
                {universities.length > 0 && (
                  <div className="pt-2">
                    <button 
                      onClick={() => {
                        setSelectedCountryFilter('All');
                        setActiveCategory('All');
                        setSearchQuery('');
                      }}
                      className="px-5 py-2.5 bg-[#570229] hover:bg-[#6F0335] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-2"
                    >
                      Reset All Filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </section>

      {/* 8. STEP-BY-STEP ADMISSIONS & VISA ROADMAP */}
      <section id="roadmap" className="py-16 lg:py-20 bg-white border-b border-[#ECE7EA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-[#8C1D4F]">
              From Application to Campus Arrival
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#1F2937]">
              The 7-Stage Schengen Admissions Journey
            </h2>
            <p className="text-sm text-[#6B7280] font-medium">
              FEREX manages every stage of your European study trajectory with real-time portal tracking, document legalization, and consular mock interviews.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {roadmapSteps.slice(0, 4).map((step) => (
              <div
                key={step.num}
                className="bg-[#F7F4F2] rounded-2xl p-6 border border-[#ECE7EA] hover:border-[#570229]/40 hover:shadow-md transition-all space-y-3.5"
              >
                <div className="w-9 h-9 rounded-xl bg-[#570229] text-white font-black text-xs flex items-center justify-center shadow-xs">
                  0{step.num}
                </div>
                <h4 className="text-base font-serif font-black text-[#1F2937]">
                  {step.title}
                </h4>
                <p className="text-xs text-[#6B7280] leading-relaxed font-medium">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {roadmapSteps.slice(4).map((step) => (
              <div
                key={step.num}
                className="bg-[#F7F4F2] rounded-2xl p-6 border border-[#ECE7EA] hover:border-[#570229]/40 hover:shadow-md transition-all space-y-3.5"
              >
                <div className="w-9 h-9 rounded-xl bg-[#570229] text-white font-black text-xs flex items-center justify-center shadow-xs">
                  0{step.num}
                </div>
                <h4 className="text-base font-serif font-black text-[#1F2937]">
                  {step.title}
                </h4>
                <p className="text-xs text-[#6B7280] leading-relaxed font-medium">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 9. STUDENT SUCCESS STORIES / TESTIMONIALS */}
      <section className="py-16 lg:py-20 bg-white border-b border-[#ECE7EA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-[#8C1D4F]">
              Student Success
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#1F2937]">
              Voices of FEREX Scholars in Europe
            </h2>
            <p className="text-sm text-[#6B7280] font-medium">
              Real international students sharing their journey from initial counseling to settling in Warsaw, Krakow, and Berlin.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {testimonials.map((item, idx) => (
              <div
                key={idx}
                className="bg-[#F7F4F2] rounded-2xl p-6 border border-[#ECE7EA] shadow-xs flex flex-col justify-between space-y-5 hover:shadow-sm transition-shadow"
              >
                <div className="space-y-3">
                  {/* Rating Stars */}
                  <div className="flex items-center gap-1 text-[#F59E0B]">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-[#F59E0B]" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-[#6B7280] italic leading-relaxed">
                    "{item.comment}"
                  </p>
                </div>

                <div className="pt-3.5 border-t border-[#ECE7EA] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#E9D7DF] text-[#570229] font-black text-xs flex items-center justify-center shrink-0">
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#1F2937]">{item.name}</h5>
                    <p className="text-[11px] text-[#8C1D4F] font-semibold">{item.course}</p>
                    <p className="text-[10px] text-[#6B7280]">{item.uni}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 10. ADMISSIONS FAQ ACCORDION */}
      <section id="faq" className="py-16 lg:py-20 bg-white border-b border-[#ECE7EA]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="text-center space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-[#8C1D4F]">
              Got Questions?
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#1F2937]">
              Frequently Asked Admissions Questions
            </h2>
            <p className="text-sm text-[#6B7280] font-medium">
              Everything you need to know about European university eligibility, fees, academic legalization authentication, and visa procedures.
            </p>
          </div>

          <div className="space-y-3 text-left">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-[#F7F4F2] rounded-xl border border-[#ECE7EA] overflow-hidden"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-4.5 text-left flex items-center justify-between gap-4 font-bold text-[#1F2937] hover:text-[#570229] transition-colors cursor-pointer text-sm"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-[#6B7280] shrink-0 transition-transform ${activeFaq === idx ? 'rotate-180 text-[#570229]' : ''}`} />
                </button>
                {activeFaq === idx && (
                  <div className="px-4.5 pb-4.5 text-xs text-[#6B7280] leading-relaxed font-medium border-t border-[#ECE7EA] pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 11. BOTTOM CALL TO ACTION BANNER (DEEP ROYAL MAROON #570229) */}
      <section className="py-14 bg-[#570229] text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
          <Logo variant="white" size="lg" className="mx-auto" />
          <h2 className="text-3xl sm:text-4xl font-serif font-black text-white leading-tight">
            Ready to Begin Your European Higher Education Journey?
          </h2>
          <p className="text-sm text-white/80 max-w-2xl mx-auto font-medium">
            Create your free student account now to upload your transcripts, unlock guaranteed university offer letters, and track your Legalization & VFS visa filing in real-time.
          </p>
          <div className="pt-2">
            <button
              onClick={() => goToLogin('signup')}
              className="h-12 px-8 rounded-xl bg-white hover:bg-[#F7F4F2] text-[#570229] text-sm font-black transition-all shadow-xl flex items-center gap-2 mx-auto cursor-pointer"
            >
              Start Free Application Today <ArrowRight className="w-4 h-4 text-[#570229]" />
            </button>
          </div>
        </div>
      </section>

      {/* 12. CLEAN LUXURY FOOTER */}
      <footer className="bg-white border-t border-[#ECE7EA] py-12 text-[#6B7280] text-xs text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 pb-8 border-b border-[#ECE7EA]">
            
            <div className="space-y-3">
              <Logo size="sm" color="#570229" />
              <p className="text-[#6B7280] font-medium leading-relaxed">
                FEREX Global Education is the official European higher education admissions division of Santoge Technologies.
              </p>
            </div>

            <div className="space-y-2">
              <h5 className="font-bold text-[#1F2937] uppercase text-[11px] tracking-wider">European Headquarters</h5>
              <p className="text-[#6B7280] font-medium leading-relaxed">
                Al. Jerozolimskie 81, 02-001<br />
                Warsaw, Republic of Poland (PL)<br />
                Tel: +48 22 890 1234
              </p>
            </div>

            <div className="space-y-2">
              <h5 className="font-bold text-[#1F2937] uppercase text-[11px] tracking-wider">India Admissions Center</h5>
              <p className="text-[#6B7280] font-medium leading-relaxed">
                Bandra-Kurla Complex (BKC)<br />
                Mumbai, Maharashtra, India (IN)<br />
                Email: admissions@ferex.education
              </p>
            </div>

            <div className="space-y-2">
              <h5 className="font-bold text-[#1F2937] uppercase text-[11px] tracking-wider">Group Portals</h5>
              <div className="space-y-1 font-semibold text-[#1F2937]">
                <Link to="/login" className="block hover:text-[#570229]">Ferex Education Portal</Link>
                <Link to="/trade/dashboard" className="block hover:text-[#570229]">Global Trade ERP</Link>
                <Link to="/rimi/dashboard" className="block hover:text-[#570229]">Rimi Frozen FMCG</Link>
                <Link to="/digital/dashboard" className="block hover:text-[#570229]">Ferex Digital Agency</Link>
              </div>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#6B7280] font-medium">
            <span>© {new Date().getFullYear()} FEREX Education Group. All rights reserved.</span>
            <div className="flex items-center gap-6">
              <a href="#destinations" className="hover:text-[#1F2937]">Privacy Policy</a>
              <a href="#destinations" className="hover:text-[#1F2937]">Terms of Admission</a>
              <a href="#destinations" className="hover:text-[#1F2937]">Academic Legalization</a>
            </div>
          </div>
        </div>
      </footer>

      {/* MISSION MODAL */}
      {isMissionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-[#ECE7EA] text-left relative">
            <button
              onClick={() => setIsMissionModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-[#F7F4F2] text-[#6B7280] hover:text-[#1F2937] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#8C1D4F]">
                FEREX EDUCATION MISSION
              </span>
              <h3 className="text-2xl font-serif font-black text-[#1F2937]">
                Democratizing World-Class European Higher Education
              </h3>
            </div>

            <p className="text-sm text-[#6B7280] leading-relaxed">
              Our mission is to bridge ambitious global students directly with accredited European universities without extortionate agent fees or opaque processing. We empower future leaders through accessible tuition, institutional transparency, and dedicated ground support in Europe.
            </p>

            <div className="space-y-3 pt-2 border-t border-[#ECE7EA]">
              <div className="flex items-start gap-3 text-xs text-[#1F2937] font-semibold">
                <Check className="w-4 h-4 text-[#0F9D58] shrink-0 mt-0.5" />
                <span>100% Direct institutional partnership agreements with European universities</span>
              </div>
              <div className="flex items-start gap-3 text-xs text-[#1F2937] font-semibold">
                <Check className="w-4 h-4 text-[#0F9D58] shrink-0 mt-0.5" />
                <span>Zero hidden agency markups — tuition is deposited directly to universities</span>
              </div>
              <div className="flex items-start gap-3 text-xs text-[#1F2937] font-semibold">
                <Check className="w-4 h-4 text-[#0F9D58] shrink-0 mt-0.5" />
                <span>Comprehensive on-arrival support including TRC filing, dorms, and bank setup</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setIsMissionModalOpen(false);
                  goToLogin('signup');
                }}
                className="w-full h-11 rounded-xl bg-[#570229] hover:bg-[#6F0335] text-white text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                Begin Your Application Journey <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
