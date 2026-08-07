import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Users, Calendar, FileText,
  Ticket, StickyNote, Bell, User, LogOut, Menu, X, Shield,
  BookOpen, Search
} from 'lucide-react';

interface StaffLayoutProps {
  children: React.ReactNode;
}

export const StaffLayout: React.FC<StaffLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const isStaffSession = localStorage.getItem('ferex_staff_demo_session');
    if (!isStaffSession) {
      navigate('/');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('ferex_staff_demo_session');
    navigate('/');
  };

  const navSections = [
    {
      title: 'WORKSPACE',
      items: [
        { name: 'Dashboard', path: '/staff/dashboard', icon: LayoutDashboard },
        { name: 'Tasks', path: '/staff/tasks', icon: CheckSquare, badge: '4' },
        { name: 'Students / Clients', path: '/staff/students', icon: Users },
        { name: 'Meetings', path: '/staff/meetings', icon: Calendar, badge: '2 Today' },
        { name: 'Documents', path: '/staff/documents', icon: FileText },
        { name: 'Tickets', path: '/staff/tickets', icon: Ticket, badge: 'Urgent' },
      ]
    },
    {
      title: 'KNOWLEDGE & NOTES',
      items: [
        { name: 'Notes & Checklists', path: '/staff/notes', icon: StickyNote },
        { name: 'SOP & Document Hub', path: '/staff/documents', icon: BookOpen },
      ]
    },
    {
      title: 'COMMUNICATION & SYSTEM',
      items: [
        { name: 'Notifications', path: '/staff/notifications', icon: Bell, badge: 'New' },
        { name: 'Employee Profile', path: '/staff/profile', icon: User },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased select-none font-sans">
      {/* Top Staff Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-4 lg:px-8 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#6A1B2E] via-[#521221] to-[#3B0B16] text-white flex items-center justify-center font-black text-xs shadow-md shadow-[#6A1B2E]/20">
              FX
            </div>
            <div>
              <span className="font-black text-slate-900 text-sm tracking-tight block">FEREX STAFF</span>
              <span className="text-[9.5px] text-slate-400 font-black uppercase tracking-widest block">Enterprise Console</span>
            </div>
          </div>
        </div>

        {/* Search Bar & Profile Header */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search assigned tasks, students..."
              className="bg-transparent border-none text-xs focus:outline-none w-full text-slate-900 placeholder:text-slate-400 font-semibold"
            />
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-[#6A1B2E]/10 border border-[#6A1B2E]/20 px-3 py-1 rounded-full text-xs font-bold text-[#6A1B2E]">
            <Shield className="w-3.5 h-3.5" />
            <span>Restricted Staff Scope</span>
          </div>

          <Link to="/staff/notifications" className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 relative">
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#6A1B2E] animate-pulse" />
          </Link>

          <Link to="/staff/profile" className="flex items-center gap-2.5 p-1.5 rounded-2xl hover:bg-slate-100 transition-all">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6A1B2E] to-[#3B0B16] text-white font-black flex items-center justify-center text-xs shadow-2xs">
              AP
            </div>
            <div className="hidden md:block text-left">
              <span className="text-xs font-black text-slate-900 block leading-tight">Arun Patel</span>
              <span className="text-[9.5px] font-bold text-emerald-600 block">● Available / On Duty</span>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-slate-400 hover:text-[#6A1B2E] hover:bg-slate-100 transition-all"
            title="Logout"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Left Categorized Enterprise Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200/80 bg-white p-4 space-y-6 shrink-0 text-left">
          {navSections.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-3 py-1.5 text-[9.5px] font-black uppercase tracking-widest text-slate-400">
                {sec.title}
              </div>
              {sec.items.map(item => {
                const IconComp = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center justify-between px-3.5 py-2 rounded-2xl text-xs font-bold transition-all ${active
                        ? 'bg-[#6A1B2E] text-white shadow-md shadow-[#6A1B2E]/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComp className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
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
                              ? 'bg-[#6A1B2E] text-white shadow-md'
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
