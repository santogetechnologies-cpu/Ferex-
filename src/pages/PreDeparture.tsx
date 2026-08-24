import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane, Home, ShieldCheck, MapPin, PhoneCall, CheckCircle2,
  Sparkles, Clock, Calendar, ExternalLink, UserCheck, AlertCircle,
  Building, Navigation, Compass, FileCheck
} from 'lucide-react';
import { Card } from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import { useVisa } from '../hooks/useVisa';
import { useApplications } from '../hooks/useApplications';
import { usePayments } from '../hooks/usePayments';
import { getPreDepartureRecords } from '../lib/api/preDeparture';
import type { PreDepartureRecord } from '../lib/api/preDeparture';

export const PreDeparture: React.FC = () => {
  const { user, profile } = useAuth();
  const { records: visaRecords } = useVisa(user?.id);
  const { applications } = useApplications(user?.id);
  const { payments } = usePayments(user?.id);

  const activeApp = applications[0];
  const targetUniversity = activeApp?.university_name || 'European Partner University';

  // Check 3rd installment payment
  const inst3Paid = payments.some(p =>
    ((p as any).stage_number === 3 || p.description?.includes('3rd') || p.payment_type?.includes('3rd')) &&
    (p.status === 'Paid' || p.status === 'Verified')
  );

  const visaRecord = visaRecords.find(r => r.student_id === user?.id || r.id === user?.id) || null;
  const isVisaApproved = (visaRecord?.decision_outcome === 'Approved') || String(visaRecord?.status_label).toLowerCase().includes('approved');

  const [depRecord, setDepRecord] = useState<PreDepartureRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'checklist' | 'dorm' | 'contacts'>('overview');

  useEffect(() => {
    const fetchRecord = async () => {
      setLoading(true);
      try {
        const recs = await getPreDepartureRecords(user?.id);
        const myEmail = user?.email?.toLowerCase();
        const myId = user?.id;

        const found = recs.find(r =>
          (myId && (r.student_id === myId || r.id === myId)) ||
          (myEmail && r.student_email?.toLowerCase() === myEmail)
        ) || null;

        if (found) {
          setDepRecord(found);
        } else {
          setDepRecord(null);
        }
      } catch (err) {
        console.warn('[PreDeparture fetch notice]:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
    window.addEventListener('ferex_pre_departure_change', fetchRecord);
    return () => window.removeEventListener('ferex_pre_departure_change', fetchRecord);
  }, [user?.id, user?.email, profile?.full_name]);

  const checklistItems = [
    { title: 'Valid Passport & Original Visa Stamping', done: isVisaApproved },
    { title: '3rd Installment & Pre-Departure Service Clearance', done: inst3Paid },
    { title: 'Original University Final Acceptance Letter & NAWA Certificate', done: true },
    { title: 'Confirmed Flight Ticket & Airline Boarding Pass', done: Boolean(depRecord?.flight_no && !depRecord.flight_no.includes('Awaiting')) },
    { title: 'University Dormitory Housing Allotment Letter', done: Boolean(depRecord?.dorm_name && !depRecord.dorm_name.includes('Pending')) },
    { title: 'European Travel Medical Insurance Coverage', done: true },
  ];

  const completedChecklistCount = checklistItems.filter(i => i.done).length;

  return (
    <div className="space-y-6 text-left relative min-h-[600px] pb-10">
      {/* Header Banner */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-[#6A1B2E] via-wine-950 to-slate-950 text-white rounded-3xl shadow-xl border border-[#6A1B2E]/30 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-10 pointer-events-none">
          <Plane className="w-96 h-96 text-white" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-black text-amber-300 border border-white/15 mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Post Travel (Stage 12)
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Post Travel Briefing & Campus Arrival
          </h1>
          <p className="text-xs md:text-sm font-medium text-slate-200 mt-2 leading-relaxed">
            Access your confirmed flight itinerary, university dormitory room keys, Warsaw airport concierge pickup, and campus arrival checklist.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className={`px-4 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border ${
              depRecord?.clearance_status === 'Clearance Granted' || depRecord?.clearance_status === 'Departed'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}>
              <CheckCircle2 className="w-4 h-4" /> {depRecord?.clearance_status || 'Pending Verification'}
            </span>
            <span className="text-xs font-bold text-slate-200 bg-white/10 px-4 py-1.5 rounded-xl border border-white/15 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-amber-300" /> Target: {depRecord?.university_name || targetUniversity}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Toolbar */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 flex-wrap">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-[#6A1B2E] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Plane className="w-4 h-4" /> Departure Flight & Pickup
        </button>
        <button
          onClick={() => setActiveTab('dorm')}
          className={`px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'dorm'
              ? 'bg-[#6A1B2E] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Home className="w-4 h-4" /> Dormitory & Housing
        </button>
        <button
          onClick={() => setActiveTab('checklist')}
          className={`px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'checklist'
              ? 'bg-[#6A1B2E] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileCheck className="w-4 h-4" /> Arrival Checklist ({completedChecklistCount}/{checklistItems.length})
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
          className={`px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'contacts'
              ? 'bg-[#6A1B2E] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <PhoneCall className="w-4 h-4" /> Emergency Contacts
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs font-bold text-slate-400 animate-pulse space-y-2">
          <Clock className="w-8 h-8 mx-auto text-slate-300" />
          <p>Fetching Pre-Departure packet from database...</p>
        </div>
      ) : !depRecord ? (
        <Card className="p-10 text-center border border-amber-200/90 bg-amber-50/40 space-y-3">
          <Clock className="w-12 h-12 text-amber-600 mx-auto" />
          <h3 className="text-base font-extrabold text-amber-950">Pre-Departure Packet Pending Clearance</h3>
          <p className="text-xs font-medium text-amber-800 max-w-md mx-auto leading-relaxed">
            Your Pre-Departure Flight & Housing packet will be issued by Admin once Stage 11 (VFS Visa Approval & 3rd Installment) is verified.
          </p>
        </Card>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-5"
            >
              {/* Flight Ticket Card */}
              <Card className="p-6 border border-slate-200/80 bg-white space-y-5 shadow-xs">
                <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
                  <div className="w-11 h-11 rounded-2xl bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center font-black shrink-0 border border-[#6A1B2E]/20">
                    <Plane className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Flight Ticket & Airline Itinerary</h3>
                    <p className="text-[11px] font-semibold text-slate-400">FEREX Student Travel & Boarding Record</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs font-semibold">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 font-medium">Airline Carrier:</span>
                    <span className="font-extrabold text-slate-900">{depRecord.airline || 'Awaiting Confirmation'}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 font-medium">Flight Number:</span>
                    <span className="font-extrabold text-slate-900 bg-slate-200/70 px-2.5 py-0.5 rounded-lg text-xs">{depRecord.flight_no || 'Awaiting Booking'}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 font-medium">Departure Date:</span>
                    <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#6A1B2E]" /> {depRecord.departure_date || 'To Be Scheduled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 font-medium">Arrival Date:</span>
                    <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" /> {depRecord.arrival_date || 'To Be Scheduled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 font-medium">Destination Airport:</span>
                    <span className="font-extrabold text-slate-900">{depRecord.arrival_city || 'European Chopin Airport'}</span>
                  </div>
                </div>
              </Card>

              {/* Airport Pickup Card */}
              <Card className="p-6 border border-slate-200/80 bg-white space-y-5 shadow-xs">
                <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black shrink-0 border border-indigo-200">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Airport Pickup & Concierge</h3>
                    <p className="text-[11px] font-semibold text-slate-400">European Welcome Representative</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs font-semibold">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 font-medium">Pickup Driver / Lead:</span>
                    <span className="font-extrabold text-slate-900">{depRecord.pickup_driver || 'FEREX Student Concierge Lead'}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 font-medium">Hotline Contact:</span>
                    <a
                      href={`tel:${depRecord.pickup_contact || '+48225520999'}`}
                      className="font-extrabold text-[#6A1B2E] hover:underline flex items-center gap-1"
                    >
                      <PhoneCall className="w-3.5 h-3.5" /> {depRecord.pickup_contact || '+48 22 552 0999'}
                    </a>
                  </div>
                  {depRecord.pickup_details && (
                    <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-1">
                      <span className="text-amber-800 text-[10px] uppercase font-black tracking-wider block">Pickup Meeting Instructions</span>
                      <p className="font-bold text-amber-950 text-xs leading-relaxed">{depRecord.pickup_details}</p>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'dorm' && (
            <motion.div
              key="dorm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="p-6 border border-slate-200/80 bg-white space-y-5 shadow-xs">
                <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-black shrink-0 border border-purple-200">
                    <Home className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">University Dormitory & Student Residence Allotment</h3>
                    <p className="text-xs font-semibold text-slate-400">On-Campus Accommodations Verified in Portal Database</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <span className="text-slate-400 text-[10px] uppercase font-black tracking-wider block">Residence Hall</span>
                    <span className="font-extrabold text-slate-900 text-sm block">{depRecord.dorm_name || 'Pending Allotment'}</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <span className="text-slate-400 text-[10px] uppercase font-black tracking-wider block">Room / Block Number</span>
                    <span className="font-extrabold text-purple-700 text-sm block">{depRecord.room_no || 'Pending Assignment'}</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <span className="text-slate-400 text-[10px] uppercase font-black tracking-wider block">Address of Stay</span>
                    <span className="font-extrabold text-slate-900 text-xs block leading-relaxed">{depRecord.dorm_address || 'On-Campus Student Dorms'}</span>
                  </div>
                </div>

                {depRecord.dorm_address && (
                  <div className="pt-2">
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(depRecord.dorm_address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold transition-all border border-purple-200"
                    >
                      <Navigation className="w-3.5 h-3.5" /> Open Address in Google Maps <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {activeTab === 'checklist' && (
            <motion.div
              key="checklist"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="p-6 border border-slate-200/80 bg-white space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Pre-Departure Mandatory Verification Checklist</h3>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">Ensure all physical document packets are ready prior to airport departure.</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black rounded-full">
                    {completedChecklistCount} / {checklistItems.length} Verified
                  </span>
                </div>

                <div className="space-y-2.5">
                  {checklistItems.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold transition-all ${
                        item.done
                          ? 'bg-emerald-50/70 text-emerald-950 border-emerald-200/80'
                          : 'bg-slate-50 text-slate-600 border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${item.done ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span>{item.title}</span>
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg border ${
                        item.done ? 'bg-emerald-200/80 text-emerald-950 border-emerald-300' : 'bg-slate-200 text-slate-600 border-slate-300'
                      }`}>
                        {item.done ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'contacts' && (
            <motion.div
              key="contacts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="p-6 border border-slate-200/80 bg-white space-y-4 shadow-xs">
                <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3">24/7 European Student Support & Emergency Helpline</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center font-black shrink-0">
                      <PhoneCall className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900">Warsaw Student Welfare Coordinator</h4>
                      <p className="text-slate-500 mt-1">{depRecord.pickup_contact || '+48 22 552 0999'} | support.poland@ferex.com</p>
                      <a
                        href={`tel:${depRecord.pickup_contact || '+48225520999'}`}
                        className="inline-flex items-center gap-1.5 text-xs font-black text-[#6A1B2E] mt-2 hover:underline"
                      >
                        <PhoneCall className="w-3.5 h-3.5" /> Call Hotline Now
                      </a>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900">Embassy & Consular Assistance Desk</h4>
                      <p className="text-slate-500 mt-1">Emergency Student Protocol Desk Warsaw, Poland</p>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 mt-2">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 24/7 Consular Support Available
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};
