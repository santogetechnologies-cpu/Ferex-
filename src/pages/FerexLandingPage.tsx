import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, Building2, ShieldCheck, ArrowRight,
  FileCheck, Plane, HelpCircle, LogIn, ChevronDown, Mail, Phone, MapPin,
  User, Users, Clock
} from 'lucide-react';
import { Logo } from '../components/Logo';

import ferexLogoImg from '../assets/ferex-logo.png';

export const FerexLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const goToLogin = () => {
    navigate('/login');
  };

  const universities = [
    {
      name: 'Warsaw University of Technology',
      city: 'Warsaw, Poland',
      degree: 'B.Sc / M.Sc Engineering & Computer Science',
      fee: '€3,000 / year',
      ranking: '#1 Tech University in Poland',
      badge: 'Top Choice',
      image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=600&q=80',
      category: 'Engineering'
    },
    {
      name: 'Kozminski University',
      city: 'Warsaw, Poland',
      degree: 'BBA / MBA Business & Management',
      fee: '€4,200 / year',
      ranking: 'Triple-Crown Accredited (EQUIS, AMBA, AACSB)',
      badge: 'AACSB Accredited',
      image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80',
      category: 'Business'
    },
    {
      name: 'Vistula University',
      city: 'Warsaw, Poland',
      degree: 'B.Sc Information Technology & Cyber Security',
      fee: '€2,500 / year',
      ranking: '#1 Internationalized University in Poland',
      badge: 'High Acceptance',
      image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
      category: 'IT & CS'
    },
    {
      name: 'AGH University of Science & Technology',
      city: 'Kraków, Poland',
      degree: 'B.Sc Data Science & Artificial Intelligence',
      fee: '€3,200 / year',
      ranking: 'Top Tier European Technical Institute',
      badge: 'Research Hub',
      image: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?auto=format&fit=crop&w=600&q=80',
      category: 'Engineering'
    },
    {
      name: 'Wroclaw University of Science and Technology',
      city: 'Wrocław, Poland',
      degree: 'M.Sc Mechanical Engineering & Robotics',
      fee: '€2,800 / year',
      ranking: 'Leading European Innovation Campus',
      badge: 'Industry Partner',
      image: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=600&q=80',
      category: 'Engineering'
    },
    {
      name: 'SWPS University of Social Sciences',
      city: 'Warsaw, Poland',
      degree: 'B.A. Psychology & UI/UX Design',
      fee: '€3,500 / year',
      ranking: '#1 Private University for Human Sciences',
      badge: 'Top Rated',
      image: 'https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?auto=format&fit=crop&w=600&q=80',
      category: 'Humanities'
    }
  ];

  const filteredUniversities = activeCategory === 'All'
    ? universities
    : universities.filter(u => u.category === activeCategory);

  const roadmapSteps = [
    { num: 1, title: 'Free Profile Audit', desc: 'Eligibility check, course matching, and academic counseling.' },
    { num: 2, title: 'University Application', desc: 'Direct submission to top European partner universities.' },
    { num: 3, title: 'Offer Letter Release', desc: 'Official admission offer letter issued within 7-14 days.' },
    { num: 4, title: 'NAWA Legalization', desc: 'Apostille & NAWA eligibility verification for Polish studies.' },
    { num: 5, title: 'Final Acceptance Letter', desc: 'Official university enrollment certificate released.' },
    { num: 6, title: 'VFS Visa Filing', desc: 'Embassy appointment booking, file preparation, & mock interview.' },
    { num: 7, title: 'National D Visa Stamp', desc: '100% compliant visa grant with European Schengen access.' },
    { num: 8, title: 'Post Travel & Pickup', desc: 'Airport pickup, dorm check-in, and local residency support.' },
  ];

  const faqs = [
    {
      q: 'How do I access my Ferex Student Portal?',
      a: 'Click on the "Student Portal Login" button on the top right or anywhere on this page. Log in using your registered email and password.'
    },
    {
      q: 'Why study in Poland and the Schengen Area?',
      a: 'Poland offers top-ranked European degrees recognized worldwide, affordable tuition fees starting from €2,500/year, low living costs, 20 hours/week part-time work rights, and post-study work permits with access to 27 Schengen countries.'
    },
    {
      q: 'What is NAWA Legalization and does Ferex handle it?',
      a: 'NAWA (Polish National Agency for Academic Exchange) is the official Polish government body that verifies international educational qualifications. Ferex Education handles your complete NAWA audit, apostille, and verification process.'
    },
    {
      q: 'Are English medium courses available without IELTS?',
      a: 'Yes! Many of our partner universities accept Medium of Instruction (MOI) certificates from accredited English-medium schools, allowing eligible students to enroll without taking IELTS.'
    },
    {
      q: 'Can I track my application and visa status online?',
      a: 'Absolutely. All Ferex students receive dedicated 24/7 access to their real-time Portal Dashboard to view document verifications, payment receipts, VFS appointment updates, and stage progress.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#24020B] text-white font-sans selection:bg-[#EAD5B5] selection:text-[#24020B] relative overflow-x-hidden">

      {/* ── NAVBAR ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#2D030D] border-b border-[#52101F]/80 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-10">
            {/* Exact FEREX Logo Asset */}
            <div className="select-none cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <img
                src={ferexLogoImg}
                alt="FEREX EDUCATION"
                className="h-12 w-auto object-contain rounded-md"
              />
            </div>

            {/* Navigation Links */}
            <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-[#E5D2D5]">
              <a href="#destinations" className="flex items-center gap-1 hover:text-[#EAD5B5] transition-colors">
                Destinations <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </a>
              <a href="#universities" className="hover:text-[#EAD5B5] transition-colors">Partner Universities</a>
              <a href="#process" className="hover:text-[#EAD5B5] transition-colors">10-Step Roadmap</a>
              <a href="#nawa" className="hover:text-[#EAD5B5] transition-colors">NAWA & Visa</a>
              <a href="#faq" className="hover:text-[#EAD5B5] transition-colors">FAQs</a>
              <a href="#about" className="flex items-center gap-1 hover:text-[#EAD5B5] transition-colors">
                About Us <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3.5">
            <button
              onClick={goToLogin}
              className="flex items-center gap-2 h-10 px-5 bg-[#3E0916] hover:bg-[#52101F] text-[#EAD5B5] rounded-xl text-xs font-bold transition-all border border-[#8C2C42] shadow-xs cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-[#E6CA9E]" /> Sign In
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ────────────────────────────────────────────────────── */}
      <section className="relative min-h-[640px] lg:min-h-[720px] bg-[#24020B] overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-24">
        {/* Background Image on Right Side */}
        <div
          className="absolute inset-0 z-0 bg-no-repeat bg-cover bg-center lg:bg-right-top"
          style={{
            backgroundImage: `url('/hero-students.jpg')`,
            backgroundPosition: 'right 30% center',
          }}
        />

        {/* High-Precision Vignette & Dark Maroon Gradient Overlays */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            background: `
              linear-gradient(to right, #24020B 0%, #24020B 38%, rgba(36,2,11,0.92) 52%, rgba(36,2,11,0.55) 75%, rgba(36,2,11,0.2) 100%),
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
                <div className="text-[10.5px] font-medium text-[#D8C5C8] leading-tight mt-0.5">Study in Poland & Europe</div>
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
              {/* Distinctive accent line */}
              <div className="w-12 h-[2px] bg-[#C5A880]/80"></div>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-sm sm:text-base text-[#EAD8DB] font-normal leading-relaxed max-w-xl"
            >
              Direct university admissions, NAWA qualification legalization, VFS visa processing, and guaranteed post-arrival support across 45+ top European institutions.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2"
            >
              <button
                onClick={goToLogin}
                className="h-12 px-7 bg-white hover:bg-[#FAF4E8] text-[#24020B] rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-xl active:scale-98 cursor-pointer"
              >
                <span>Access Student Portal</span>
                <ArrowRight className="w-4 h-4 text-[#24020B]" />
              </button>

              <a
                href="#universities"
                className="h-12 px-6 bg-transparent hover:bg-white/5 text-white border border-white/25 hover:border-white/40 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <span>Explore Universities</span>
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
                <div className="text-2xl sm:text-3xl lg:text-[34px] font-serif font-bold text-[#EAD5B5] leading-none">45+</div>
                <div className="text-xs text-[#D8C5C8] font-medium mt-1">Partner Universities</div>
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

      {/* ── WHY FEREX EDUCATION ─────────────────────────────────────────────── */}
      <section id="destinations" className="py-20 bg-[#3E0017] border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wider">Unmatched Excellence</span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Why Choose Ferex Education?</h2>
            <p className="text-xs sm:text-sm font-semibold text-rose-100/80">We streamline every step from initial profile evaluation to university graduation.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#50001D] border border-white/12 hover:border-white/30 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-xl group">
              <div className="w-12 h-12 rounded-xl bg-white/10 text-amber-300 border border-white/15 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <FileCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white mb-2">NAWA Legalization</h3>
              <p className="text-xs font-semibold text-rose-100/80 leading-relaxed">Direct handling of Polish National Agency for Academic Exchange (NAWA) qualification verification & apostille processing.</p>
            </div>

            <div className="bg-[#50001D] border border-white/12 hover:border-white/30 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-xl group">
              <div className="w-12 h-12 rounded-xl bg-white/10 text-amber-300 border border-white/15 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white mb-2">Direct Admissions</h3>
              <p className="text-xs font-semibold text-rose-100/80 leading-relaxed">Official admission representation for top Polish state and private universities with fast 7-14 day offer letter release.</p>
            </div>

            <div className="bg-[#50001D] border border-white/12 hover:border-white/30 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-xl group">
              <div className="w-12 h-12 rounded-xl bg-white/10 text-emerald-300 border border-white/15 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white mb-2">VFS Visa Clearance</h3>
              <p className="text-xs font-semibold text-rose-100/80 leading-relaxed">Complete guidance for VFS appointment booking, financial proof verification, and embassy visa officer interview preparation.</p>
            </div>

            <div className="bg-[#50001D] border border-white/12 hover:border-white/30 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-xl group">
              <div className="w-12 h-12 rounded-xl bg-white/10 text-amber-300 border border-white/15 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Plane className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white mb-2">Post Travel & Dorm Support</h3>
              <p className="text-xs font-semibold text-rose-100/80 leading-relaxed">Airport pickup in Warsaw/Krakow, student dormitory room assignment, local SIM card, and Temporary Residence Permit (Karta Pobytu) aid.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PARTNER UNIVERSITIES ───────────────────────────────────────────── */}
      <section id="universities" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wider">Top Institutions</span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-1">Featured Partner Universities</h2>
            <p className="text-xs sm:text-sm font-semibold text-rose-100/80 mt-1">Explore accredited European universities offering English-taught programs.</p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {['All', 'Engineering', 'Business', 'IT & CS', 'Humanities'].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-white text-[#50001D] shadow-md font-black'
                    : 'bg-white/10 text-white border border-white/15 hover:bg-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* University Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUniversities.map((uni) => (
            <motion.div
              layout
              key={uni.name}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#3E0017] border border-white/12 rounded-2xl overflow-hidden flex flex-col justify-between hover:shadow-2xl transition-all group"
            >
              <div>
                <div className="h-44 relative overflow-hidden bg-[#2A000F]">
                  <img
                    src={uni.image}
                    alt={uni.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#3E0017] via-transparent to-transparent" />
                  <span className="absolute top-3 right-3 text-[10px] font-black bg-[#50001D] text-amber-300 border border-amber-300/30 px-2.5 py-1 rounded-full shadow-xs">
                    {uni.badge}
                  </span>
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs font-bold text-white">
                    <MapPin className="w-3.5 h-3.5 text-amber-300" /> {uni.city}
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <h3 className="text-base font-extrabold text-white leading-snug group-hover:text-amber-300 transition-colors">
                    {uni.name}
                  </h3>
                  <p className="text-xs font-semibold text-rose-100/80">{uni.degree}</p>
                  
                  <div className="pt-2 flex items-center justify-between text-xs border-t border-white/10">
                    <span className="font-bold text-rose-100/70">Tuition Fee:</span>
                    <span className="font-extrabold text-amber-300 bg-amber-400/10 px-2.5 py-0.5 rounded-lg border border-amber-400/20">
                      {uni.fee}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0">
                <button
                  onClick={goToLogin}
                  className="w-full h-10 bg-white text-[#50001D] hover:bg-rose-50 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  <span>Apply via Student Portal</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#50001D]" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── 10-STAGE ROADMAP ───────────────────────────────────────────────── */}
      <section id="process" className="py-20 bg-[#3E0017] border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wider">Streamlined Process</span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Your 10-Step European Study Roadmap</h2>
            <p className="text-xs sm:text-sm font-semibold text-rose-100/80">Track every stage in real-time inside your personal Ferex Student Portal.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {roadmapSteps.map((step) => (
              <div key={step.num} className="bg-[#50001D] border border-white/12 rounded-2xl p-5 relative overflow-hidden text-left hover:border-white/30 transition-all shadow-md">
                <span className="text-3xl font-black text-white/10 absolute top-3 right-4 select-none">0{step.num}</span>
                <div className="w-8 h-8 rounded-lg bg-white text-[#50001D] font-black text-xs flex items-center justify-center mb-3 shadow-sm">
                  #{step.num}
                </div>
                <h4 className="text-sm font-extrabold text-white mb-1">{step.title}</h4>
                <p className="text-xs font-semibold text-rose-100/80 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQS ───────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 space-y-2">
          <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wider">Have Questions?</span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div key={idx} className="bg-[#3E0017] border border-white/12 rounded-2xl overflow-hidden shadow-lg transition-colors">
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 focus:outline-none"
                >
                  <span className="text-sm font-extrabold text-white flex items-center gap-2.5">
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
      </section>

      {/* ── HIGH IMPACT CTA BANNER ─────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-[#6A1B2E] via-[#50001D] to-[#3B0C17] border border-white/20 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl text-white">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-5">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Ready to Begin Your European Education Journey?
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-rose-100/90 leading-relaxed">
              Access your personalized student application portal, track your visa, upload documents, and view fee receipts in real time.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={goToLogin}
                className="w-full sm:w-auto h-12 px-8 bg-white hover:bg-rose-50 text-[#50001D] rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-xl active:scale-98"
              >
                <GraduationCap className="w-5 h-5 text-[#50001D]" />
                <span>Go to Ferex Portal Sign In</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="bg-[#2A000F] border-t border-white/10 pt-16 pb-12 text-xs font-semibold text-rose-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="space-y-3 md:col-span-1">
              <Logo variant="compact" color="white" size="md" subtitle="EDUCATION" />
              <p className="text-xs font-semibold text-rose-200/70 leading-relaxed pt-2">
                Premier higher education consultancy facilitating direct European university admissions, NAWA qualification legalization, and Schengen student visas.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4">Quick Navigation</h4>
              <ul className="space-y-2">
                <li><a href="#destinations" className="hover:text-white transition-colors">Study Destinations</a></li>
                <li><a href="#universities" className="hover:text-white transition-colors">Partner Universities</a></li>
                <li><a href="#process" className="hover:text-white transition-colors">10-Step Roadmap</a></li>
                <li><button onClick={goToLogin} className="hover:text-white transition-colors">Student Portal Login</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4">European Office</h4>
              <ul className="space-y-2 text-rose-200/70">
                <li className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" /> Warsaw, Poland</li>
                <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-amber-300 shrink-0" /> info@ferexeducation.com</li>
                <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-amber-300 shrink-0" /> +48 22 123 4567</li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4">Student Access</h4>
              <p className="text-xs font-semibold text-rose-200/70 mb-3">
                Already registered? Sign in to view your offer letters, NAWA status, and VFS tracking.
              </p>
              <button
                onClick={goToLogin}
                className="w-full h-9 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-extrabold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-300" /> Portal Login
              </button>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-rose-200/60">
            <p>© {new Date().getFullYear()} Ferex Education. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <button onClick={goToLogin} className="hover:text-white">Privacy Policy</button>
              <button onClick={goToLogin} className="hover:text-white">Terms of Service</button>
              <button onClick={goToLogin} className="hover:text-white">Student Portal</button>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};
