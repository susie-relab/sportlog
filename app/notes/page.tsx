'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Activity, EXERCISE_TYPE_LABELS, EXERCISE_TYPE_COLORS } from '@/types';
import { formatDate, todayLocalISO, openDatePicker, formatDistance } from '@/lib/utils';
import ImageUploader from '@/components/ImageUploader';
import ImageGallery from '@/components/ImageGallery';

interface StandaloneNote {
  id: string;
  title: string;
  body: string;
  date: string;
  created_at: string;
  sort_order: number;
  hidden: boolean;
  image_urls?: string[] | null;
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
  const [date, setDate] = useState(todayLocalISO());
  const [images, setImages] = useState<string[]>([]);

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
    setDate(todayLocalISO());
    setImages([]);
    setShowForm(true);
  };

  const openEdit = (n: StandaloneNote) => {
    setEditingNote(n);
    setTitle(n.title);
    setBody(n.body);
    setDate(n.date);
    setImages(n.image_urls ?? []);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !body.trim() || !user) return;
    setSaving(true);
    const image_urls = images.length ? images : null;
    if (editingNote) {
      const { data, error } = await supabase.from('notes')
        .update({ title: title.trim(), body: body.trim(), date, image_urls })
        .eq('id', editingNote.id)
        .select()
        .single();
      if (!error && data) {
        setNotes(prev => prev.map(n => n.id === editingNote.id ? { ...data as StandaloneNote } : n));
      }
    } else {
      const { data, error } = await supabase.from('notes')
        .insert({ user_id: user.id, title: title.trim(), body: body.trim(), date, image_urls, sort_order: Date.now() })
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

  // Hide/unhide — keeps the header (name/title) visible, conceals the body text.
  const toggleHideNote = async (n: StandaloneNote) => {
    const hidden = !n.hidden;
    setNotes(prev => prev.map(x => x.id === n.id ? { ...x, hidden } : x));
    await supabase.from('notes').update({ hidden }).eq('id', n.id);
  };
  const toggleHideActivity = async (a: Activity) => {
    const note_hidden = !a.note_hidden;
    setActivities(prev => prev.map(x => x.id === a.id ? { ...x, note_hidden } : x));
    await supabase.from('activities').update({ note_hidden }).eq('id', a.id);
  };

  // Edit an activity's note text + photos (the note on a logged activity).
  const [editActId, setEditActId] = useState<string | null>(null);
  const [editActText, setEditActText] = useState('');
  const [editActImages, setEditActImages] = useState<string[]>([]);
  const openEditActivity = (a: Activity) => { setEditActId(a.id); setEditActText(a.notes || ''); setEditActImages(a.image_urls ?? []); };
  const saveActivityNote = async (a: Activity) => {
    const text = editActText.trim();
    const image_urls = editActImages.length ? editActImages : null;
    setActivities(prev => prev.map(x => x.id === a.id ? { ...x, notes: text, image_urls } : x));
    setEditActId(null);
    await supabase.from('activities').update({ notes: text || null, image_urls }).eq('id', a.id);
  };

  // Reorder a standalone note against the adjacent note sharing the same date.
  // Normalizes the whole same-date group to sequential order first, so legacy
  // notes that all share sort_order=0 still reorder correctly on first use.
  const moveNote = async (id: string, direction: 'up' | 'down') => {
    const date = notes.find(n => n.id === id)?.date;
    if (!date) return;
    const group = [...notes]
      .filter(n => n.date === date)
      .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
    const idx = group.findIndex(n => n.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= group.length) return;
    const ids = group.map(n => n.id);
    [ids[idx], ids[swapIdx]] = [ids[swapIdx], ids[idx]];
    const updates = ids.map((noteId, i) => ({ id: noteId, sort_order: i }));
    setNotes(prev => prev.map(n => {
      const u = updates.find(x => x.id === n.id);
      return u ? { ...n, sort_order: u.sort_order } : n;
    }));
    await Promise.all(updates.map(u => supabase.from('notes').update({ sort_order: u.sort_order }).eq('id', u.id)));
  };

  // Merge and sort all items by date desc; standalone notes on the same date
  // keep their manually-set relative order (activity notes stay date-sorted).
  const allItems: NoteItem[] = [
    ...notes.map(n => ({ ...n, _type: 'note' as const })),
    ...activities.filter(a => (a.notes || '').trim()).map(a => ({ ...a, _type: 'activity' as const })),
  ].sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    if (a._type === 'note' && b._type === 'note') return a.sort_order - b.sort_order;
    return 0;
  });

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
      <p className="text-sm text-[#64748B] mb-4">Training diary: including notes from activities</p>

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
              onClick={openDatePicker}
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
            {user && <ImageUploader userId={user.id} value={images} onChange={setImages} />}
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
              const sameDate = notes.filter(n => n.date === item.date).sort((a, b) => a.sort_order - b.sort_order);
              const posInGroup = sameDate.findIndex(n => n.id === item.id);
              const canReorder = sameDate.length > 1;
              return (
                <div key={item.id} className="card border-l-2" style={{ borderLeftColor: '#6366F1' }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">Note</span>
                      <span className="text-sm font-semibold text-white truncate">{item.title}</span>
                    </div>
                    <span className="text-xs text-[#475569] whitespace-nowrap flex-shrink-0">{formatDate(item.date)}</span>
                  </div>
                  {item.hidden
                    ? <p className="text-sm text-[#475569] italic mb-3">🔒 Note hidden</p>
                    : <>
                        <p className="text-sm text-[#94A3B8] leading-relaxed whitespace-pre-line mb-3">{item.body}</p>
                        {item.image_urls && item.image_urls.length > 0 && <div className="mb-3"><ImageGallery urls={item.image_urls} /></div>}
                      </>}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => openEdit(item)}
                      className="text-xs text-[#64748B] hover:text-white transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => toggleHideNote(item)}
                      className="text-xs text-[#64748B] hover:text-white transition-colors"
                    >
                      {item.hidden ? '👁 Unhide' : '🙈 Hide'}
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-xs text-red-500/70 hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                    {canReorder && (
                      <div className="flex items-center gap-1 ml-auto">
                        <span className="text-[10px] text-[#475569] mr-1">Same day — reorder:</span>
                        <button
                          onClick={() => moveNote(item.id, 'up')}
                          disabled={posInGroup === 0}
                          className="w-6 h-6 rounded border border-[#334155] text-[#94A3B8] text-xs disabled:opacity-30 hover:border-[#475569] disabled:hover:border-[#334155]"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveNote(item.id, 'down')}
                          disabled={posInGroup === sameDate.length - 1}
                          className="w-6 h-6 rounded border border-[#334155] text-[#94A3B8] text-xs disabled:opacity-30 hover:border-[#475569] disabled:hover:border-[#334155]"
                        >
                          ↓
                        </button>
                      </div>
                    )}
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
                {editActId === item.id ? (
                  <div className="flex flex-col gap-2 mb-2">
                    <textarea className="input" rows={3} value={editActText} onChange={e => setEditActText(e.target.value)} style={{ resize: 'vertical' }} />
                    {user && <ImageUploader userId={user.id} value={editActImages} onChange={setEditActImages} label="Photos" />}
                    <div className="flex gap-2">
                      <button onClick={() => saveActivityNote(item)} className="btn-primary text-xs px-3 py-1.5">Save</button>
                      <button onClick={() => setEditActId(null)} className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
                    </div>
                  </div>
                ) : item.note_hidden
                  ? <p className="text-sm text-[#475569] italic">🔒 Note hidden</p>
                  : <>
                      <p className="text-sm text-[#94A3B8] leading-relaxed whitespace-pre-line">{item.notes}</p>
                      {item.image_urls && item.image_urls.length > 0 && <div className="mt-2"><ImageGallery urls={item.image_urls} /></div>}
                    </>}
                <div className="flex gap-3 mt-2 text-xs text-[#475569]">
                  <span>{item.duration_minutes}m</span>
                  {item.distance_km ? <span>{formatDistance(item.distance_km, item.exercise_type)}</span> : null}
                  {item.pace_min_km ? <span>{Math.floor(item.pace_min_km)}:{String(Math.round((item.pace_min_km % 1) * 60)).padStart(2, '0')}/km</span> : null}
                </div>
                {editActId !== item.id && (
                  <div className="flex items-center gap-3 mt-2">
                    <button onClick={() => openEditActivity(item)} className="text-xs text-[#64748B] hover:text-white transition-colors">✏️ Edit</button>
                    <button onClick={() => toggleHideActivity(item)} className="text-xs text-[#64748B] hover:text-white transition-colors">{item.note_hidden ? '👁 Unhide' : '🙈 Hide'}</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
