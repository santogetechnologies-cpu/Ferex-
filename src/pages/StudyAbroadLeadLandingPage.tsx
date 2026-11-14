import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Phone, Mail, User, Globe, Award, ShieldCheck,
  CheckCircle2, ArrowRight, Sparkles, Building2, BookOpen, Clock,
  MessageSquare, Star, ChevronDown, Check, Send, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import {
  getLeadFormConfig,
  createEducationLead,
  type LeadFormConfig,
  DEFAULT_LEAD_FORM_CONFIG
} from '../lib/api/educationLeads';

const POPULAR_DESTINATIONS = [
  { name: 'Poland', flag: 'PL', desc: 'Affordable tuition, English programs & NAWA legalization', popular: true },
  { name: 'Germany', flag: 'DE', desc: 'No-tuition public universities & high tech job market', popular: true },
  { name: 'Italy', flag: 'IT', desc: 'Historic institutions, DSU scholarships & CIMEA verification', popular: true },
  { name: 'Moldova', flag: 'MD', desc: 'Low-cost European degrees (USMF, USM, UTM)', popular: true },
  { name: 'France', flag: 'FR', desc: 'Prestigious Grandes Écoles & Campus France EEF pathways', popular: false },
  { name: 'Spain', flag: 'ES', desc: 'Top business schools, vibrant culture & UNEDasiss conversion', popular: false },
  { name: 'Czech Republic', flag: 'CZ', desc: 'Central European innovation & Nostrification recognition', popular: false },
  { name: 'Hungary', flag: 'HU', desc: 'Stipendium Hungaricum grants & medical excellence', popular: false },
];

const COUNTRY_CODES = [
  { code: '+91', country: 'IN', label: 'India (+91)' },
  { code: '+971', country: 'AE', label: 'UAE (+971)' },
  { code: '+966', country: 'SA', label: 'Saudi Arabia (+966)' },
  { code: '+44', country: 'GB', label: 'United Kingdom (+44)' },
  { code: '+49', country: 'DE', label: 'Germany (+49)' },
  { code: '+48', country: 'PL', label: 'Poland (+48)' },
  { code: '+1', country: 'US', label: 'USA / Canada (+1)' },
  { code: '+373', country: 'MD', label: 'Moldova (+373)' },
  { code: '+39', country: 'IT', label: 'Italy (+39)' },
];

export const StudyAbroadLeadLandingPage: React.FC = () => {
  const [formConfig, setFormConfig] = useState<LeadFormConfig>(DEFAULT_LEAD_FORM_CONFIG);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [preferredCountry, setPreferredCountry] = useState('Poland');
  const [degreeLevel, setDegreeLevel] = useState("Bachelor's Degree");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedLeadName, setSubmittedLeadName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    getLeadFormConfig()
      .then((cfg) => setFormConfig(cfg))
      .finally(() => setLoadingConfig(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Strict Phone Number Validation (Phone is always compulsory)
    const rawDigits = phoneNumber.replace(/[^\d]/g, '');
    if (!rawDigits || rawDigits.length < 8) {
      setErrorMsg('Please enter a valid mobile / WhatsApp number (at least 8-10 digits).');
      return;
    }

    const fullPhone = `${countryCode} ${phoneNumber.trim()}`;

    setSubmitting(true);
    try {
      const created = await createEducationLead({
        name: formConfig.name_enabled ? name.trim() : 'Prospective Student',
        phone: fullPhone,
        email: formConfig.email_enabled ? email.trim() : undefined,
        preferred_country: formConfig.country_enabled ? preferredCountry : 'Europe',
        degree_level: formConfig.degree_level_enabled ? degreeLevel : "Bachelor's Degree",
        source: 'Admissions Lead Landing Page',
        notes: `Prospective applicant interested in ${preferredCountry} (${degreeLevel})`,
      });

      setSubmittedLeadName(created.name || 'Student');
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission failed. Please check your phone number and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-[#58051E] selection:text-white antialiased">
      {/* ── Top Header Bar ── */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#58051E] flex items-center justify-center text-white font-black shadow-lg shadow-[#58051E]/30">
              <GraduationCap className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-white block">FEREX EDUCATION</span>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">European Admissions & Visas</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Student Portal Login
            </Link>
            <a
              href="#apply-form"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-[#58051E] hover:bg-[#720a28] text-white text-xs font-black rounded-xl transition-all shadow-md shadow-[#58051E]/20"
            >
              <span>Apply Free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero Section with Side-by-Side Lead Form ── */}
      <section className="relative overflow-hidden py-12 md:py-20 lg:py-24 border-b border-slate-800">
        {/* Ambient glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#58051E]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Column: Value Proposition & Destination Highlights */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#58051E]/30 border border-[#58051E]/50 text-amber-300 text-xs font-extrabold tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5" /> 2026 European Intake Applications Open
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                Study in Europe with <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-cyan-300">Expert Admissions</span> & Visa Support
              </h1>

              <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed max-w-2xl">
                Direct partnerships with state and private European universities across Poland, Germany, Italy, Moldova, France, and Spain. Complete document legalization (NAWA, APS, CIMEA) and consular coaching.
              </p>

              {/* Trust Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 mb-1" />
                  <div className="text-xs font-black text-white">100% Legalization</div>
                  <div className="text-[11px] text-slate-400">NAWA, APS, Sworn Apostille</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80">
                  <Award className="w-5 h-5 text-amber-400 mb-1" />
                  <div className="text-xs font-black text-white">Direct University Offers</div>
                  <div className="text-[11px] text-slate-400">Fast-track admission letters</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 col-span-2 sm:col-span-1">
                  <MessageSquare className="w-5 h-5 text-cyan-400 mb-1" />
                  <div className="text-xs font-black text-white">Instant WhatsApp Advisory</div>
                  <div className="text-[11px] text-slate-400">Direct counselor guidance</div>
                </div>
              </div>

              {/* Destinations Pills */}
              <div className="pt-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-2">Featured Higher Education Destinations:</span>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_DESTINATIONS.map((d) => (
                    <div
                      key={d.name}
                      onClick={() => setPreferredCountry(d.name)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        preferredCountry === d.name
                          ? 'bg-[#58051E] text-white border-[#58051E] shadow-sm'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-[10px] font-mono px-1 rounded bg-black/30 font-black">{d.flag}</span>
                      <span>{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Dynamic Lead Capture Form */}
            <div id="apply-form" className="lg:col-span-5">
              <div className="bg-slate-800/95 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
                
                <div className="mb-6 text-left">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20 inline-block mb-2">
                    Free University Screening
                  </span>
                  <h3 className="text-xl font-black text-white">
                    {formConfig.headline || 'Apply for European Admissions'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Fill out your details below. Our Admissions Counselor will connect with you with personalized university options and WhatsApp updates.
                  </p>
                </div>

                {errorMsg && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                  {/* Full Name Field (Toggleable in Settings) */}
                  {formConfig.name_enabled && (
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full h-11 pl-10 pr-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-[#58051E] focus:ring-2 focus:ring-[#58051E]/30"
                        />
                      </div>
                    </div>
                  )}

                  {/* Phone Number Field (ALWAYS COMPULSORY) */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <span>Mobile / WhatsApp Number</span>
                        <span className="text-rose-400">*</span>
                      </span>
                      <span className="text-[10px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">
                        COMPULSORY
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="h-11 px-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-[#58051E]"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.country} ({c.code})
                          </option>
                        ))}
                      </select>
                      <div className="relative flex-1">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="tel"
                          required
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="98200 12345"
                          className="w-full h-11 pl-10 pr-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-[#58051E] focus:ring-2 focus:ring-[#58051E]/30"
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      We will send verified university brochures and eligibility confirmation directly to your WhatsApp.
                    </span>
                  </div>

                  {/* Email Field (Toggleable in Settings, Optional) */}
                  {formConfig.email_enabled && (
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Email Address</span>
                        <span className="text-[10px] font-semibold text-slate-400">Optional</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. rahul@example.com"
                          className="w-full h-11 pl-10 pr-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-[#58051E] focus:ring-2 focus:ring-[#58051E]/30"
                        />
                      </div>
                    </div>
                  )}

                  {/* Preferred Destination Country (Toggleable in Settings) */}
                  {formConfig.country_enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                          Preferred Country
                        </label>
                        <select
                          value={preferredCountry}
                          onChange={(e) => setPreferredCountry(e.target.value)}
                          className="w-full h-11 px-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-[#58051E]"
                        >
                          {POPULAR_DESTINATIONS.map((d) => (
                            <option key={d.name} value={d.name}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Degree Level (Toggleable in Settings) */}
                      {formConfig.degree_level_enabled && (
                        <div>
                          <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                            Degree Level
                          </label>
                          <select
                            value={degreeLevel}
                            onChange={(e) => setDegreeLevel(e.target.value)}
                            className="w-full h-11 px-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-[#58051E]"
                          >
                            <option value="Bachelor's Degree">Bachelor's (3-4 Yrs)</option>
                            <option value="Master's Degree">Master's (1-2 Yrs)</option>
                            <option value="Integrated Degree">Integrated (MBBS/MD)</option>
                            <option value="Doctorate (PhD)">Doctorate (PhD)</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-12 bg-[#58051E] hover:bg-[#720a28] text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-[#58051E]/30 flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Submitting Your Enquiry...</span>
                      </>
                    ) : (
                      <>
                        <span>{formConfig.submit_button_text || 'Submit Admission Enquiry'}</span>
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </Button>

                  <div className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1.5 pt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Your data is confidential. No spam guaranteed. Instant WhatsApp advisory sent.</span>
                  </div>
                </form>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Destination Details Cards ── */}
      <section className="py-16 bg-slate-900/60 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">European Universities Network</span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">Study Programs & Schengen Pathways</h2>
            <p className="text-xs text-slate-400 mt-2">
              Select your preferred European study destination. We facilitate complete end-to-end guidance from preliminary university eligibility to arrival in Europe.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            {POPULAR_DESTINATIONS.slice(0, 4).map((dest) => (
              <div key={dest.name} className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 hover:border-[#58051E]/60 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-black px-2 py-0.5 rounded bg-slate-700 text-amber-300">{dest.flag}</span>
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Fast-Track</span>
                  </div>
                  <h4 className="text-base font-black text-white">{dest.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{dest.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPreferredCountry(dest.name);
                    document.getElementById('apply-form')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="mt-4 text-xs font-bold text-amber-300 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <span>Select {dest.name}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SUCCESS MODAL WITH WHATSAPP CONFIRMATION ── */}
      <AnimatePresence>
        {submitted && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
              onClick={() => setSubmitted(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-4 z-10"
            >
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 inline-block mb-2">
                  Enquiry Registered Successfully
                </span>
                <h3 className="text-2xl font-black text-white">
                  Thank You, {submittedLeadName}!
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Your admission enquiry for <span className="font-bold text-amber-300">{preferredCountry}</span> has been assigned to our Senior European Admissions Desk.
                </p>
              </div>

              {/* WhatsApp Automation Confirmation Box */}
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-left space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-black text-xs">
                  <MessageSquare className="w-4 h-4" />
                  <span>Automated WhatsApp Advisory Dispatched</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  We have automatically dispatched a welcome message and European universities guide to <span className="font-bold text-white">{countryCode} {phoneNumber}</span>. Please check your WhatsApp to review the brochure and connect directly with your assigned counselor.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <Button
                  onClick={() => {
                    setSubmitted(false);
                    setName('');
                    setPhoneNumber('');
                    setEmail('');
                  }}
                  variant="outline"
                  className="flex-1 text-xs font-bold border-slate-700 text-slate-300 hover:text-white"
                >
                  Submit Another Enquiry
                </Button>
                <Link
                  to="/login"
                  className="flex-1 h-10 px-4 bg-[#58051E] hover:bg-[#720a28] text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-[#58051E]/20"
                >
                  <span>Student Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Footer ── */}
      <footer className="mt-auto border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">FEREX Global Higher Education</span>
            <span>• European University Admissions Advisory</span>
          </div>
          <div className="text-[11px] text-slate-500">
            © {new Date().getFullYear()} FEREX Group. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

