'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Activity, EXERCISE_TYPE_LABELS, EXERCISE_TYPE_COLORS } from '@/types';
import { formatDate } from '@/lib/utils';

interface StandaloneNote {
  id: string;
  title: string;
  body: string;
  date: string;
  created_at: string;
  _type: 'note';
}

interface ActivityNote extends Activity {
  _type: 'activity';
}

type NoteItem = StandaloneNote | ActivityNote;

export default function NotesPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notes, setNotes] = useState<StandaloneNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingNote, setEditingNote] = useState<StandaloneNote | null>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('activities').select('*').eq('user_id', user.id)
        .not('notes', 'is', null).neq('notes', '').order('date', { ascending: false }),
      supabase.from('notes').select('*').eq('user_id', user.id).order('date', { ascending: false }),
    ]).then(([{ data: acts }, { data: ns }]) => {
      setActivities((acts as Activity[]) || []);
      setNotes((ns as StandaloneNote[]) || []);
      setLoading(false);
    });
  }, [user]);

  const openAdd = () => {
    setEditingNote(null);
    setTitle('');
    setBody('');
    setDate(new Date().toISOString().split('T')[0]);
    setShowForm(true);
  };

  const openEdit = (n: StandaloneNote) => {
    setEditingNote(n);
    setTitle(n.title);
    setBody(n.body);
    setDate(n.date);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !body.trim() || !user) return;
    setSaving(true);
    if (editingNote) {
      const { data, error } = await supabase.from('notes')
        .update({ title: title.trim(), body: body.trim(), date })
        .eq('id', editingNote.id)
        .select()
        .single();
      if (!error && data) {
        setNotes(prev => prev.map(n => n.id === editingNote.id ? { ...data as StandaloneNote } : n));
      }
    } else {
      const { data, error } = await supabase.from('notes')
        .insert({ user_id: user.id, title: title.trim(), body: body.trim(), date })
        .select()
        .single();
      if (!error && data) {
        setNotes(prev => [data as StandaloneNote, ...prev]);
      }
    }
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('notes').delete().eq('id', id);
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  // Merge and sort all items by date desc
  const allItems: NoteItem[] = [
    ...notes.map(n => ({ ...n, _type: 'note' as const })),
    ...activities.map(a => ({ ...a, _type: 'activity' as const })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const filtered = search
    ? allItems.filter(item =>
        item._type === 'note'
          ? item.title.toLowerCase().includes(search.toLowerCase()) || item.body.toLowerCase().includes(search.toLowerCase())
          : item.notes?.toLowerCase().includes(search.toLowerCase()) || item.name.toLowerCase().includes(search.toLowerCase())
      )
    : allItems;

  if (loading) return <div className="text-[#64748B] text-sm">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-1 gap-2">
        <h1 className="text-xl font-bold text-white">Notes</h1>
        <button onClick={openAdd} className="btn-primary text-sm px-4 py-2 flex-shrink-0">+ Add Note</button>
      </div>
      <p className="text-sm text-[#64748B] mb-4">Training diary &amp; standalone notes</p>

      {showForm && (
        <div className="card mb-5 border-blue-600/40">
          <h2 className="text-sm font-semibold text-white mb-3">{editingNote ? 'Edit Note' : 'New Note'}</h2>
          <div className="flex flex-col gap-3">
            <input
              className="input"
              placeholder="Title"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <input
              type="date"
              className="input"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
            <textarea
              className="input"
              placeholder="Write your note..."
              rows={5}
              value={body}
              onChange={e => setBody(e.target.value)}
              style={{ resize: 'vertical' }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !title.trim() || !body.trim()}
                className="btn-primary flex-1"
              >
                {saving ? 'Saving…' : editingNote ? 'Save Changes' : 'Save Note'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <input
        type="text"
        className="input mb-4"
        placeholder="Search notes..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-[#64748B] text-sm">
            {search ? 'No notes match your search.' : 'No notes yet. Add a note or add notes when logging activities.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(item => {
            if (item._type === 'note') {
              return (
                <div key={item.id} className="card border-l-2" style={{ borderLeftColor: '#6366F1' }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">Note</span>
                      <span className="text-sm font-semibold text-white truncate">{item.title}</span>
                    </div>
                    <span className="text-xs text-[#475569] whitespace-nowrap flex-shrink-0">{formatDate(item.date)}</span>
                  </div>
                  <p className="text-sm text-[#94A3B8] leading-relaxed whitespace-pre-line mb-3">{item.body}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(item)}
                      className="text-xs text-[#64748B] hover:text-white transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-xs text-red-500/70 hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            }
            return (
              <div key={item.id} className="card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: EXERCISE_TYPE_COLORS[item.exercise_type] + '22',
                        color: EXERCISE_TYPE_COLORS[item.exercise_type],
                      }}
                    >
                      {EXERCISE_TYPE_LABELS[item.exercise_type]}
                    </span>
                    <span className="text-sm font-semibold text-white truncate">{item.name}</span>
                  </div>
                  <span className="text-xs text-[#475569] whitespace-nowrap flex-shrink-0">{formatDate(item.date)}</span>
                </div>
                <p className="text-sm text-[#94A3B8] leading-relaxed whitespace-pre-line">{item.notes}</p>
                <div className="flex gap-3 mt-2 text-xs text-[#475569]">
                  <span>{item.duration_minutes}m</span>
                  {item.distance_km ? <span>{item.distance_km} km</span> : null}
                  {item.pace_min_km ? <span>{Math.floor(item.pace_min_km)}:{String(Math.round((item.pace_min_km % 1) * 60)).padStart(2, '0')}/km</span> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
