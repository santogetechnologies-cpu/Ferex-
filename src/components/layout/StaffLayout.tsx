import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Users, Calendar, FileText,
  Ticket, StickyNote, Bell, User, LogOut, Menu, X, Shield,
  BookOpen, Search
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AppSwitcher } from '../AppSwitcher';

interface StaffLayoutProps {
  children: React.ReactNode;
}

export const StaffLayout: React.FC<StaffLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const staffName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Staff Member';
  const staffRole = profile?.role || user?.user_metadata?.role || 'Counselor';

  const handleLogout = async () => {
    await signOut();
    localStorage.removeItem('ferex_staff_demo_session');
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
      title: 'COUNSELOR WORKSPACE',
      items: [
        { name: 'Dashboard', path: '/staff/dashboard', icon: LayoutDashboard },
        { name: 'Operational Tasks', path: '/staff/tasks', icon: CheckSquare },
        { name: 'Assigned Students', path: '/staff/students', icon: Users },
        { name: 'Document Verification', path: '/staff/documents', icon: FileText },
        { name: 'Meetings & Planner', path: '/staff/meetings', icon: Calendar },
        { name: 'Support Tickets', path: '/staff/tickets', icon: Ticket },
      ]
    },
    {
      title: 'ACCOUNT & PREFERENCES',
      items: [
        { name: 'Employee Profile', path: '/staff/profile', icon: User },
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
          >
            {mobileOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7.5 h-7.5 rounded-lg bg-[#58051E] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              FX
            </div>
            <div>
              <span className="font-bold text-slate-900 text-xs tracking-tight block leading-none">FEREX STAFF</span>
              <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block mt-0.5">Counselor Workspace</span>
            </div>
          </div>
        </div>

        {/* Search Bar & Profile Header */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 h-8.5 rounded-xl text-xs font-medium text-slate-600 w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search tasks, students..."
              className="bg-transparent border-none text-xs focus:outline-none w-full text-slate-900 placeholder:text-slate-400 font-medium"
            />
          </div>

          <div className="hidden sm:flex items-center gap-1.5 bg-[#58051E]/5 border border-[#58051E]/15 px-2.5 py-1 rounded-md text-[10px] font-bold text-[#58051E]">
            <Shield className="w-3 h-3" />
            <span>{staffRole.toUpperCase()}</span>
          </div>

          {/* 4-App Switcher */}
          <AppSwitcher />

          <Link to="/staff/profile" className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-all">
            <div className="w-7.5 h-7.5 rounded-lg bg-[#58051E] text-white font-bold flex items-center justify-center text-xs shadow-2xs">
              {staffName.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <span className="text-xs font-bold text-slate-900 block leading-tight">{staffName}</span>
              <span className="text-[9px] font-medium text-emerald-600 block">Active Staff</span>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Left Categorized Enterprise Sidebar */}
        <aside className="hidden lg:flex flex-col w-60 border-r border-slate-200/80 bg-white p-3 space-y-4 shrink-0 text-left">
          {navSections.map((sec, idx) => (
            <div key={idx} className="space-y-0.5">
              <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                {sec.title}
              </div>
              {sec.items.map(item => {
                const IconComp = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${active
                        ? 'bg-[#58051E]/8 text-[#58051E] font-bold border-l-2 border-[#58051E]'
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
                  <span className="font-black text-slate-900 text-sm">FEREX Staff Workspace</span>
                  <button onClick={() => setMobileOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {navSections.map((sec, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="px-3 py-1 text-[9.5px] font-black uppercase tracking-widest text-slate-400">
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
                          className={`flex items-center gap-3 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all ${active
                              ? 'bg-[#58051E] text-white shadow-md'
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
