import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, CheckCircle2, Plus, Search, Trash2, X, Pin } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

const initialNotes = [
  { id: 'N-01', title: 'Manchester UK CAS Checklist', category: 'Student Applications', pinned: true, content: 'Ensure tuition deposit receipt (£2,000) and ATAS certificate are attached before CAS issuance request.', date: '2026-08-05' },
  { id: 'N-02', title: 'Canada Study Visa SOP Guidelines', category: 'SOP Guidelines', pinned: true, content: 'Statement of Purpose must clearly state home ties, career progression in India, and course alignment.', date: '2026-08-04' },
  { id: 'N-03', title: 'Weekly Staff Team Sync Notes', category: 'Meeting Summary', pinned: false, content: 'Focus on clearing 14 pending IELTS verification requests before Friday.', date: '2026-08-02' },
];

export const StaffNotes: React.FC = () => {
  const [toast, setToast] = useState('');
  const [notes, setNotes] = useState(initialNotes);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Student Applications');
  const [newContent, setNewContent] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleAddNote = () => {
    if (!newTitle || !newContent) return;
    const newNoteObj = {
      id: `N-0${notes.length + 1}`,
      title: newTitle,
      category: newCategory,
      pinned: false,
      content: newContent,
      date: new Date().toISOString().split('T')[0],
    };
    setNotes([newNoteObj, ...notes]);
    showToast('New personal work note created!');
    setNewTitle('');
    setNewContent('');
    setShowAddModal(false);
  };

  const handleDelete = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    showToast('Note deleted');
  };

  const togglePin = (id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
    showToast('Note pin status toggled');
  };

  const filteredNotes = notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6 text-left antialiased select-none">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-[#6A1B2E]" /> Notion Knowledge & Notes Workspace
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Keep personal advisory checklists, university SOP guidelines, and student application summaries.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search knowledge notes..."
              className="w-full bg-white border border-slate-300 rounded-xl py-1.5 pl-3 pr-8 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
          </div>
          <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Create Note
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredNotes.map(note => (
          <Card key={note.id} className="p-5 border border-slate-200/80 shadow-xs hover:shadow-lg transition-all space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase bg-[#6A1B2E]/10 text-[#6A1B2E] px-2 py-0.5 rounded border border-[#6A1B2E]/20">{note.category}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => togglePin(note.id)} className={`text-slate-400 hover:text-amber-500 ${note.pinned ? 'text-amber-500' : ''}`}><Pin className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(note.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <h3 className="text-sm font-black text-slate-900">{note.title}</h3>
              <p className="text-xs font-semibold text-slate-600 leading-relaxed">{note.content}</p>
            </div>
            <span className="text-[10px] font-bold text-slate-400 border-t border-slate-100 pt-2 block">{note.date}</span>
          </Card>
        ))}
      </div>

      {/* Add Note Modal Drawer */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">Create Personal Work Note</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-3 text-xs font-semibold">
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Title</label>
                  <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Note Title..." className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900" />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Category</label>
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900">
                    <option>Student Applications</option>
                    <option>SOP Guidelines</option>
                    <option>Meeting Summary</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Content</label>
                  <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Type note details..." className="w-full h-24 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900" />
                </div>
              </div>

              <Button size="sm" className="w-full bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={handleAddNote}>
                Save Personal Note
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
