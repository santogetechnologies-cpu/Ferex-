import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Search, MapPin, Award, ArrowRight, Sparkles, BookOpen, Clock, DollarSign, Calendar, Heart, X } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

export const SelectUniversity: React.FC = () => {
  // Input states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [savedUnis, setSavedUnis] = useState<number[]>([1]); // Default save Stanford
  const [successToast, setSuccessToast] = useState('');
  const [drawerUni, setDrawerUni] = useState<any>(null);

  // Mock Universities catalog
  const mockUniversities = [
    {
      id: 1,
      name: 'University of Warsaw',
      location: 'Warsaw, Poland',
      country: 'Poland',
      ranking: 'QS Global Rank: #262',
      course: 'M.Sc. in Computer Science',
      tuition: '₹3,15,000 / year',
      duration: '2 Years',
      intake: 'Feb 2026',
      status: 'Offer Received',
      statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      initials: 'UW',
      avatarBg: 'bg-red-50 text-red-700',
    },
    {
      id: 2,
      name: 'TU Berlin (Technical University of Berlin)',
      location: 'Berlin, Germany',
      country: 'Germany',
      ranking: 'QS Global Rank: #154',
      course: 'M.Sc. in Data Engineering',
      tuition: '₹0 (Semester Fee: ₹27,000)',
      duration: '2 Years',
      intake: 'Oct 2026',
      status: 'Under Review',
      statusColor: 'bg-blue-50 text-blue-700 border-blue-100',
      initials: 'TUB',
      avatarBg: 'bg-indigo-50 text-indigo-700',
    },
    {
      id: 3,
      name: 'University of Amsterdam',
      location: 'Amsterdam, Netherlands',
      country: 'Netherlands',
      ranking: 'QS Global Rank: #53',
      course: 'M.A. in Business Analytics',
      tuition: '₹14,85,000 / year',
      duration: '1 Year',
      intake: 'Sep 2026',
      status: 'Docs Pending',
      statusColor: 'bg-amber-50 text-amber-700 border-amber-100',
      initials: 'UVA',
      avatarBg: 'bg-sky-50 text-sky-700',
    },
    {
      id: 4,
      name: 'Leiden University',
      location: 'Leiden, Netherlands',
      country: 'Netherlands',
      ranking: 'QS Global Rank: #126',
      course: 'LL.M. in International Law',
      tuition: '₹17,37,000 / year',
      duration: '1 Year',
      intake: 'Feb 2026',
      status: 'Catalog Choice',
      statusColor: 'bg-slate-50 text-slate-600 border-slate-100',
      initials: 'LU',
      avatarBg: 'bg-amber-50 text-amber-700',
    },
    {
      id: 5,
      name: 'University of Gdansk',
      location: 'Gdansk, Poland',
      country: 'Poland',
      ranking: 'QS Global Rank: #801',
      course: 'M.Sc. in Marine Biology',
      tuition: '₹2,70,000 / year',
      duration: '2 Years',
      intake: 'Feb 2026',
      status: 'Catalog Choice',
      statusColor: 'bg-slate-50 text-slate-600 border-slate-100',
      initials: 'UG',
      avatarBg: 'bg-emerald-50 text-emerald-700',
    }
  ];

  // Filtering logic
  const filteredUnis = mockUniversities.filter((uni) => {
    const matchesSearch =
      uni.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      uni.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      uni.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCountry = selectedCountry === 'All' || uni.country === selectedCountry;

    return matchesSearch && matchesCountry;
  });

  // Toggle Save
  const handleSaveToggle = (id: number) => {
    if (savedUnis.includes(id)) {
      setSavedUnis(savedUnis.filter(item => item !== id));
    } else {
      setSavedUnis([...savedUnis, id]);
    }
  };

  // Mock Apply trigger
  const handleApplyClick = (uniName: string) => {
    setSuccessToast(`Application initiated for ${uniName}!`);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  return (
    <div className="space-y-6 text-left relative">
      {/* Dynamic Success Toast */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#6A1B2E] text-white px-4 py-3 rounded-lg shadow-lg text-xs font-bold flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            {successToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1.5 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#6A1B2E]/5 text-[#6A1B2E] flex items-center justify-center">
              <Target className="w-5 h-5" />
            </span>
            Select University
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            Ferex Education • Choose, filter, and save your target global institutions.
          </p>
        </div>
      </div>

      {/* Search and Filters row */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by university name, course, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-lg bg-white border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#6A1B2E] focus:ring-2 focus:ring-[#6A1B2E]/10 transition-all"
          />
        </div>

        {/* Filter dropdown */}
        <div className="relative min-w-[160px]">
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="w-full h-11 px-3 border border-slate-200 rounded-lg bg-white text-sm font-semibold text-slate-700 focus:outline-none focus:border-[#6A1B2E]"
          >
            <option value="All">All Countries</option>
            <option value="USA">United States</option>
            <option value="UK">United Kingdom</option>
            <option value="Poland">Poland</option>
            <option value="Germany">Germany</option>
          </select>
        </div>
      </div>

      {/* Results grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {filteredUnis.length > 0 ? (
          filteredUnis.map((uni) => {
            const isSaved = savedUnis.includes(uni.id);

            return (
              <Card key={uni.id} hoverEffect className="h-full flex flex-col justify-between p-6">
                <div>
                  {/* Top: Initials & Bookmark & Badge */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl ${uni.avatarBg} font-extrabold flex items-center justify-center text-sm shadow-xs select-none`}>
                      {uni.initials}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveToggle(uni.id)}
                        className={`p-1.5 rounded-full border transition-all ${
                          isSaved 
                            ? 'bg-rose-50 border-rose-100 text-rose-500' 
                            : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                        }`}
                        title={isSaved ? 'Remove from Saved' : 'Save to Board'}
                      >
                        <Heart className="w-4 h-4 fill-current" />
                      </button>
                      <span className={`text-[9px] uppercase font-extrabold tracking-wider px-2.5 py-1 border rounded-full ${uni.statusColor}`}>
                        {uni.status}
                      </span>
                    </div>
                  </div>

                  {/* Header Titles */}
                  <h3 className="text-base font-extrabold text-slate-900 leading-snug mb-1">{uni.name}</h3>
                  <p className="text-xs font-bold text-[#6A1B2E] mb-4 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> {uni.course}
                  </p>

                  <div className="space-y-2 border-t border-slate-50 pt-4 mb-6">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{uni.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <Award className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{uni.ranking}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Tuition: {uni.tuition}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-50/50">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>{uni.duration}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>{uni.intake}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                  <Button size="sm" variant="outline" className="flex-grow text-xs" onClick={() => setDrawerUni(uni)}>
                    Overview
                  </Button>
                  <Button size="sm" className="flex-grow text-xs flex items-center justify-center gap-1.5" onClick={() => handleApplyClick(uni.name)}>
                    Apply <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center">
            <p className="text-sm font-semibold text-slate-400">No universities match your filters.</p>
          </div>
        )}
      </div>

      {/* University Details Drawer */}
      <AnimatePresence>
        {drawerUni && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50"
              onClick={() => setDrawerUni(null)}
            />
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-[450px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-100"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white">
                <h3 className="text-base font-bold text-slate-900 truncate pr-4">{drawerUni.name}</h3>
                <button
                  onClick={() => setDrawerUni(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center font-bold text-2xl ${drawerUni.avatarBg} shadow-sm border border-white`}>
                    {drawerUni.initials}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{drawerUni.name}</h4>
                    <p className="text-sm font-semibold text-slate-500">{drawerUni.location}</p>
                    <span className="inline-block mt-2 px-2.5 py-1 text-xs font-bold bg-primary/10 text-primary rounded-md">
                      {drawerUni.ranking}
                    </span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-slate-900">Program Details</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 mb-1">Course</p>
                      <p className="text-sm font-bold text-slate-700">{drawerUni.course}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 mb-1">Tuition</p>
                      <p className="text-sm font-bold text-slate-700">{drawerUni.tuition}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 mb-1">Duration</p>
                      <p className="text-sm font-bold text-slate-700">{drawerUni.duration}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 mb-1">Intake</p>
                      <p className="text-sm font-bold text-slate-700">{drawerUni.intake}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-900 mb-3">About the University</h4>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    This is a highly ranked global institution offering top-tier academic programs and research opportunities. The university boasts state-of-the-art facilities, a diverse student body, and strong industry connections to help accelerate your career.
                  </p>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-100 bg-white flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setDrawerUni(null)}>
                  Close
                </Button>
                <Button className="flex-1" onClick={() => {
                  handleApplyClick(drawerUni.name);
                  setDrawerUni(null);
                }}>
                  Apply Now
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
