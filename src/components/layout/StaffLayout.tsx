import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Users, GraduationCap, FileText,
  Ticket, Building2, Globe, User, LogOut, Menu, X, Shield,
  Search, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface StaffLayoutProps {
  children: React.ReactNode;
}

export const StaffLayout: React.FC<StaffLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const staffName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admissions Counselor';
  const staffRole = 'Admissions Counselor';
  const staffInitials = staffName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'AC';

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  interface NavItem {
    name: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }

  interface NavSection {
    title: string;
    items: NavItem[];
  }

  const navSections: NavSection[] = [
    {
      title: 'ADMISSIONS & COUNSELING',
      items: [
        { name: 'Dashboard', path: '/staff/dashboard', icon: LayoutDashboard },
        { name: 'My Tasks', path: '/staff/tasks', icon: CheckSquare },
        { name: 'Assigned Students', path: '/staff/students', icon: Users },
        { name: 'Admissions & Applications', path: '/staff/applications', icon: GraduationCap },
        { name: 'Document Verification', path: '/staff/documents', icon: FileText },
        { name: 'University Catalog', path: '/staff/universities', icon: Building2 },
        { name: 'Study Destinations', path: '/staff/destinations', icon: Globe },
      ]
    },
    {
      title: 'COMMUNICATION & SUPPORT',
      items: [
        { name: 'Student Support Tickets', path: '/staff/tickets', icon: Ticket },
      ]
    },
    {
      title: 'COUNSELOR ACCOUNT',
      items: [
        { name: 'Counselor Profile', path: '/staff/profile', icon: User },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased select-none font-sans">
      {/* Top Staff Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#58051E] text-white flex items-center justify-center font-black text-xs shadow-sm tracking-tighter">
              FX
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-xs tracking-tight block leading-none">FEREX EDUCATION</span>
                <span className="hidden sm:inline-block text-[8.5px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                  STAFF PORTAL
                </span>
              </div>
              <span className="text-[9.5px] text-slate-400 font-semibold tracking-wider block mt-0.5">
                Admissions Counselor Workspace
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar & Profile Header */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-1.5 bg-[#58051E]/5 border border-[#58051E]/15 px-2.5 py-1 rounded-md text-[10px] font-extrabold text-[#58051E]">
            <Shield className="w-3 h-3 text-[#58051E]" />
            <span>ADMISSIONS COUNSELOR</span>
          </div>

          <Link to="/staff/profile" className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 transition-all">
            <div className="w-8 h-8 rounded-lg bg-[#58051E] text-white font-black flex items-center justify-center text-xs shadow-xs">
              {staffInitials}
            </div>
            <div className="hidden md:block text-left">
              <span className="text-xs font-bold text-slate-900 block leading-tight">{staffName}</span>
              <span className="text-[9.5px] font-semibold text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Active Counselor
              </span>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Left Admissions Counselor Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200/80 bg-white p-3.5 space-y-4 shrink-0 text-left">
          {navSections.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                {sec.title}
              </div>
              {sec.items.map(item => {
                const IconComp = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? 'bg-[#58051E]/10 text-[#58051E] font-bold border-l-3 border-[#58051E]'
                        : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconComp className={`w-4 h-4 ${active ? 'text-[#58051E]' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}

          {/* Bottom Education Module Notice */}
          <div className="mt-auto pt-4 border-t border-slate-100 px-2.5">
            <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/70">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Education Module</span>
              </div>
              <p className="text-[9.5px] text-slate-400 mt-1 leading-relaxed">
                Counselor workspace restricted to Education student records, applications & tasks.
              </p>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900 z-40 lg:hidden"
                onClick={() => setMobileOpen(false)}
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.2 }}
                className="fixed top-0 left-0 bottom-0 w-64 bg-white z-50 p-4 space-y-6 shadow-2xl lg:hidden text-left overflow-y-auto"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="font-extrabold text-slate-900 text-sm block">FEREX EDUCATION</span>
                    <span className="text-[10px] text-[#58051E] font-bold">Admissions Counselor</span>
                  </div>
                  <button onClick={() => setMobileOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {navSections.map((sec, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="px-3 py-1 text-[9.5px] font-extrabold uppercase tracking-widest text-slate-400">
                      {sec.title}
                    </div>
                    {sec.items.map(item => {
                      const IconComp = item.icon;
                      const active = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                            active
                              ? 'bg-[#58051E] text-white shadow-xs'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};
