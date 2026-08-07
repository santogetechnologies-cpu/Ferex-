import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, User, Video, Mic, MicOff, VideoOff, PhoneOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

export const Meetings: React.FC = () => {
  // In-memory meetings list
  const [meetings] = useState([
    {
      id: 1,
      subject: 'Stanford Academic Portfolio Review',
      date: 'Aug 12, 2026',
      time: '10:00 AM - 10:45 AM',
      advisor: 'Dr. Evelyn Carter (Academic Lead)',
      status: 'Scheduled',
      active: true,
    },
    {
      id: 2,
      subject: 'NAWA Legal Documents Legalization Briefing',
      date: 'Aug 24, 2026',
      time: '02:00 PM - 02:30 PM',
      advisor: 'Adam Kowalski (Operations Coordinator)',
      status: 'Scheduled',
      active: true,
    },
    {
      id: 3,
      subject: 'TOEFL Score & Admissions Onboarding',
      date: 'Jul 15, 2026',
      time: '11:00 AM - 12:00 PM',
      advisor: 'Sarah Jenkins (Ferex Agent)',
      status: 'Completed',
      active: false,
    }
  ]);

  // Video call states
  const [activeCallSubject, setActiveCallSubject] = useState<string | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  // Calendar dates mock helper
  const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="space-y-6 text-left relative">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1.5 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#6A1B2E]/5 text-[#6A1B2E] flex items-center justify-center">
              <CalendarIcon className="w-5 h-5" />
            </span>
            Meetings Center
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            Ferex Education • Book and join advisory, document verification, and visa coordination video meets.
          </p>
        </div>
      </div>

      {/* Main Grid: Calendar on left, Meeting list on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Mock Calendar Widget (2 columns) */}
        <Card className="lg:col-span-2 p-6 select-none">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h3 className="text-sm font-extrabold text-slate-900">Advisory Planner • August 2026</h3>
            <div className="flex items-center gap-1.5">
              <button className="p-1 rounded hover:bg-slate-50 border border-slate-200 text-slate-400">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="p-1 rounded hover:bg-slate-50 border border-slate-200 text-slate-400">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grid Headers */}
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-extrabold text-slate-400 uppercase mb-2">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar grid items (Start block with empty grid cells to shift dates) */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-700">
            {/* Shifts: Aug 1 2026 was Saturday (6 offset grids) */}
            {Array.from({ length: 5 }).map((_, idx) => (
              <span key={`off-${idx}`} className="h-10" />
            ))}

            {calendarDays.map((day) => {
              const isToday = day === 6; // Aug 06
              const isMeeting = day === 12 || day === 24;

              return (
                <div
                  key={day}
                  className={`h-10 rounded-lg flex flex-col items-center justify-center relative cursor-pointer border ${isToday
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : isMeeting
                      ? 'border-[#6A1B2E] bg-[#6A1B2E]/5 font-bold text-[#6A1B2E] hover:bg-[#6A1B2E]/10'
                      : 'border-slate-100 hover:border-slate-300 bg-white'
                    }`}
                >
                  <span>{day}</span>
                  {/* Small bullet mark for schedule */}
                  {isMeeting && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6A1B2E] absolute bottom-1" />
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Meeting agenda list */}
        <div className="space-y-4">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest pl-1 mb-3">Upcoming Agenda</h3>
          {meetings.map((meet) => {
            const isCompleted = meet.status === 'Completed';

            return (
              <Card key={meet.id} className={`p-5 flex flex-col justify-between h-56 select-none ${meet.active ? 'border-l-4 border-l-[#6A1B2E]' : 'border-slate-100'}`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{meet.date}</span>
                    <span className={`text-[9px] uppercase font-extrabold px-2 py-0.5 border rounded-full ${isCompleted
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                      {meet.status}
                    </span>
                  </div>

                  <h4 className="text-xs font-extrabold text-slate-900 leading-snug">{meet.subject}</h4>

                  <div className="space-y-1.5 text-xs text-slate-500 font-semibold pt-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{meet.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[200px]">{meet.advisor}</span>
                    </div>
                  </div>
                </div>

                {meet.active && (
                  <Button
                    size="sm"
                    className="text-xs font-bold h-9 mt-4 flex items-center justify-center gap-1.5 shadow-none"
                    onClick={() => setActiveCallSubject(meet.subject)}
                  >
                    <Video className="w-4 h-4" /> Join Video Call
                  </Button>
                )}
              </Card>
            );
          })}
        </div>

      </div>

      {/* FULLSCREEN MOCK VIDEO CALL SIMULATOR MODAL */}
      <AnimatePresence>
        {activeCallSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950">
            {/* Main call grid */}
            <div className="w-full h-full relative flex flex-col justify-between p-6">

              {/* Top Bar: Subject and Status */}
              <div className="flex items-center justify-between text-white select-none z-10">
                <div className="text-left space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Connection: Secured SSL
                  </span>
                  <h2 className="text-sm font-bold text-slate-200">{activeCallSubject}</h2>
                </div>
                <div className="bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold">
                  09:41
                </div>
              </div>

              {/* Center Screen: Advisor Video Feed Simulator */}
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900 overflow-hidden">
                {!videoOff ? (
                  <div className="flex flex-col items-center justify-center space-y-4 text-white text-center">
                    {/* Stylized big avatar represent video feed */}
                    <div className="w-32 h-32 rounded-full bg-[#6A1B2E] text-white font-extrabold flex items-center justify-center text-4xl shadow-2xl border-4 border-white/20 select-none">
                      FC
                    </div>
                    <div className="space-y-1 select-none">
                      <h3 className="text-lg font-bold">Dr. Evelyn Carter</h3>
                      <p className="text-xs text-slate-400 font-semibold">Ferex Academic Lead Adviser</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 font-bold text-xs">Video Feed Paused</div>
                )}

                {/* Self Webcam Corner view */}
                <div className="absolute bottom-28 right-6 w-36 h-48 bg-slate-800 border-2 border-white/20 rounded-xl overflow-hidden shadow-2xl z-10 flex items-center justify-center">
                  <div className="text-center text-white space-y-2 select-none">
                    <div className="w-12 h-12 rounded-full bg-slate-700 text-white font-bold flex items-center justify-center text-xs mx-auto">
                      SJ
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">You (Preview)</span>
                  </div>
                </div>
              </div>

              {/* Bottom Control Bar */}
              <div className="flex items-center justify-center gap-4 z-10 select-none">
                {/* Mute button */}
                <button
                  onClick={() => setMicMuted(!micMuted)}
                  className={`p-4 rounded-full text-white transition-colors ${micMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-white/10 hover:bg-white/20'
                    }`}
                  title={micMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                >
                  {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                {/* Stop Video Button */}
                <button
                  onClick={() => setVideoOff(!videoOff)}
                  className={`p-4 rounded-full text-white transition-colors ${videoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-white/10 hover:bg-white/20'
                    }`}
                  title={videoOff ? 'Start Video' : 'Stop Video'}
                >
                  {videoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>

                {/* End call button */}
                <button
                  onClick={() => setActiveCallSubject(null)}
                  className="p-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition-colors"
                  title="End Session"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </div>

            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
