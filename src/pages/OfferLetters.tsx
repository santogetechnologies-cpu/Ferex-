import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Check, X, ShieldAlert, Sparkles } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

export const OfferLetters: React.FC = () => {
  // In-memory active offers log
  const [offers, setOffers] = useState([
    {
      id: 1,
      offerNo: 'OF-2026-9041',
      university: 'Massachusetts Institute of Technology',
      course: 'M.S. in Electrical Engineering & Computer Science',
      date: 'Aug 02, 2026',
      status: 'Pending Response',
      initials: 'MIT',
      avatarBg: 'bg-indigo-50 text-indigo-700',
    },
    {
      id: 2,
      offerNo: 'OF-2026-7840',
      university: 'Stanford University',
      course: 'M.S. in Computer Science',
      date: 'Jul 29, 2026',
      status: 'Expired',
      initials: 'SU',
      avatarBg: 'bg-red-50 text-red-700',
    }
  ]);

  const [toastMessage, setToastMessage] = useState('');

  // Handle Accept
  const handleAccept = (id: number) => {
    setOffers(prevOffers =>
      prevOffers.map(offer =>
        offer.id === id ? { ...offer, status: 'Accepted' } : offer
      )
    );
    showToast('Offer accepted successfully! Ferex enrollment specialists will be in contact.');
  };

  // Handle Reject
  const handleReject = (id: number) => {
    setOffers(prevOffers =>
      prevOffers.map(offer =>
        offer.id === id ? { ...offer, status: 'Rejected' } : offer
      )
    );
    showToast('Offer declined. Selecting next target institutions.');
  };

  // Handle Download simulation
  const handleDownload = (offerNo: string) => {
    showToast(`Downloading official offer letter file: ${offerNo}.pdf`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  return (
    <div className="space-y-6 text-left relative">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#6A1B2E] text-white px-4 py-3 rounded-lg shadow-lg text-xs font-bold flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1.5 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#6A1B2E]/5 text-[#6A1B2E] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </span>
            Offer Letters
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            Ferex Education • Download formal acceptance letters and confirm admissions offers.
          </p>
        </div>
      </div>

      {/* Offers log cards */}
      <div className="space-y-5">
        {offers.map((offer) => {
          const isPending = offer.status === 'Pending Response';
          const isAccepted = offer.status === 'Accepted';
          const isRejected = offer.status === 'Rejected';

          let statusTag = 'bg-slate-50 text-slate-500 border-slate-100';
          if (isAccepted) statusTag = 'bg-emerald-50 text-emerald-700 border-emerald-100';
          if (isPending) statusTag = 'bg-amber-50 text-amber-700 border-amber-100';
          if (offer.status === 'Expired' || isRejected) statusTag = 'bg-red-50 text-red-700 border-red-100';

          return (
            <Card key={offer.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-slate-200 transition-all select-none">
              <div className="flex items-start gap-4">
                {/* Logo */}
                <div className={`w-12 h-12 rounded-xl ${offer.avatarBg} font-extrabold flex items-center justify-center text-sm shadow-xs shrink-0`}>
                  {offer.initials}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">{offer.offerNo}</span>
                    <span className={`text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 border rounded-full ${statusTag}`}>
                      {offer.status}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-snug">{offer.university}</h3>
                  <p className="text-xs font-bold text-slate-500">{offer.course}</p>
                  <p className="text-[10px] font-bold text-slate-400 pt-1">Issued: {offer.date}</p>
                </div>
              </div>

              {/* Action buttons panel */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0 border-t border-slate-50 pt-4 md:pt-0 md:border-t-0 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs flex items-center gap-1.5 h-9"
                  onClick={() => handleDownload(offer.offerNo)}
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </Button>

                {isPending && (
                  <>
                    <Button
                      size="sm"
                      className="text-xs flex items-center gap-1.5 h-9 bg-red-600 hover:bg-red-700 active:bg-red-600 shadow-none"
                      onClick={() => handleReject(offer.id)}
                    >
                      <X className="w-3.5 h-3.5" /> Decline
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs flex items-center gap-1.5 h-9"
                      onClick={() => handleAccept(offer.id)}
                    >
                      <Check className="w-3.5 h-3.5" /> Accept Offer
                    </Button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Advisory Note */}
      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-slate-800">Formal Admissions Terms</h4>
          <p className="text-[11px] text-slate-400 font-semibold leading-relaxed mt-0.5">
            Accepting an offer letter marks the transition of your student portal to post-acceptance clearance (including tuition deposit routing, scheduling travel files, and visa briefs). Please consult your advisor before declining active offers.
          </p>
        </div>
      </div>
    </div>
  );
};
