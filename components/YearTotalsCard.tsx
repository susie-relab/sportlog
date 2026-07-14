'use client';
import { useMemo, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  Activity, ExerciseType, EXERCISE_TYPE_COLORS, YearTotalTile, DEFAULT_YEAR_TOTAL_TILES, MAX_YEAR_TOTAL_TILES,
  activityMatchesFavouriteKey, allFavouriteItems, FavouriteItem,
} from '@/types';
import { EXERCISE_TYPE_ICONS } from '@/lib/shareIcons';
import { SUBTYPE_ICON_OVERRIDES } from '@/lib/subtypeIcons';
import { todayLocalISO, formatDistance } from '@/lib/utils';

interface Props {
  activities: Activity[];
  config: YearTotalTile[] | undefined;
  onSave: (tiles: YearTotalTile[]) => void;
}

// Hand-drawn pencil for the edit trigger, matching the doodle style used everywhere else
// in this card instead of a plain emoji.
function PencilDoodle({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      <path d="M4 20v-4L15 5a3 3 0 0 1 4 4L8 20Z" />
      <path d="M13 7 17 11" />
    </svg>
  );
}

function baseType(key: string): ExerciseType {
  const sep = key.indexOf(':');
  return (sep === -1 ? key : key.slice(0, sep)) as ExerciseType;
}

// For a "both" tile, the Year figure only shows distance (the Month figure below it already
// gives the fuller distance-and-count breakdown, so repeating both at the Year level is just
// noise) — Month shows the full "distance | count" combo.
function displayValue(tile: YearTotalTile, periodActivities: Activity[], period: 'year' | 'month'): string {
  const matches = periodActivities.filter(a => activityMatchesFavouriteKey(a, tile.key));
  const kmSum = matches.reduce((s, a) => s + (a.distance_km || 0), 0);
  // Round before formatting — summing many decimal distance_km values leaves floating-point
  // dust (e.g. 35.599999999999994) that formatDistance doesn't clean up on its own.
  const km = Math.round(kmSum * 1000) / 1000;
  const dist = formatDistance(km, baseType(tile.key));
  if (tile.metric === 'distance') return dist;
  if (tile.metric === 'count') return String(matches.length);
  return period === 'year' ? dist : `${dist} | ${matches.length}`;
}

function subtypeOf(key: string): string {
  const sep = key.indexOf(':');
  return sep === -1 ? '' : key.slice(sep + 1);
}

/** One per exercise type (shared by every subtype tab of that type), unless the specific
 *  subtype has its own override (e.g. Golf gets a club + ball instead of the generic
 *  Sport trophy). */
function TabDoodle({ tileKey, size = 20, className }: { tileKey: string; size?: number; className?: string }) {
  const Override = SUBTYPE_ICON_OVERRIDES[subtypeOf(tileKey)];
  if (Override) return <Override size={size} className={className} />;
  const Icon = EXERCISE_TYPE_ICONS[baseType(tileKey)];
  return <Icon size={size} className={className} />;
}

// Pure UTC-based date arithmetic — avoids the classic bug where round-tripping through a
// local-time Date + toISOString() shifts dates backward in timezones ahead of UTC.
function addDaysLocal(dateISO: string, n: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().split('T')[0];
}
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // getUTCDay(): 0 = Sunday
function weekdayLetter(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  return WEEKDAY_LETTERS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export default function YearTotalsCard({ activities, config, onSave }: Props) {
  const tiles = config ?? DEFAULT_YEAR_TOTAL_TILES;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<YearTotalTile[]>(tiles);
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeKey, setActiveKey] = useState<string | null>(tiles[0]?.key ?? null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const draggingKeyRef = useRef<string | null>(null);

  const registry = useMemo(() => new Map(allFavouriteItems().map(i => [i.key, i] as [string, FavouriteItem])), []);
  const year = new Date().getFullYear();
  const todayISO = todayLocalISO();
  const monthStart = todayISO.slice(0, 7) + '-01';
  const yearActivities = useMemo(() => activities.filter(a => a.date >= `${year}-01-01`), [activities, year]);
  const monthActivities = useMemo(() => yearActivities.filter(a => a.date >= monthStart), [yearActivities, monthStart]);
  const last7 = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const date = addDaysLocal(todayISO, -(6 - i));
    return { date, letter: weekdayLetter(date), isToday: date === todayISO };
  }), [todayISO]);

  const startEditing = () => { setDraft(tiles); setEditing(true); };
  const cancelEditing = () => { setEditing(false); setPickedKey(null); setSearch(''); };
  const save = () => {
    onSave(draft);
    setEditing(false);
    setPickedKey(null);
    setSearch('');
    if (!draft.some(t => t.key === activeKey)) setActiveKey(draft[0]?.key ?? null);
  };
  const removeTile = (key: string) => setDraft(prev => prev.filter(t => t.key !== key));
  // Adds a new tab, or updates the metric of one already in the draft — same picker modal
  // handles both, since tapping an existing tab opens it straight to the metric step.
  const setTileMetric = (key: string, metric: YearTotalTile['metric']) => {
    setDraft(prev => prev.some(t => t.key === key)
      ? prev.map(t => t.key === key ? { ...t, metric } : t)
      : [...prev, { key, metric }]);
    setPickedKey(null);
    setSearch('');
  };

  // Drag-to-reorder for the edit-mode tab strip — press and hold a tab (not its remove
  // button) then drag over another to swap positions, same interaction as the Profile
  // favourites picker. A press-release with no drag in between is treated as a tap, opening
  // that tab's metric editor instead.
  const dragMovedRef = useRef(false);
  const handleDragPointerDown = (key: string) => (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    draggingKeyRef.current = key;
    dragMovedRef.current = false;
    setDraggingKey(key);
    window.addEventListener('pointermove', handleDragPointerMove);
    window.addEventListener('pointerup', handleDragPointerUp);
  };
  const handleDragPointerMove = (e: PointerEvent) => {
    const dragKey = draggingKeyRef.current;
    if (!dragKey) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const overKey = (el?.closest('[data-tile-key]') as HTMLElement | null)?.dataset.tileKey;
    if (!overKey || overKey === dragKey) return;
    dragMovedRef.current = true;
    setDraft(prev => {
      const from = prev.findIndex(t => t.key === dragKey);
      const to = prev.findIndex(t => t.key === overKey);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };
  const handleDragPointerUp = () => {
    const key = draggingKeyRef.current;
    const moved = dragMovedRef.current;
    draggingKeyRef.current = null;
    setDraggingKey(null);
    window.removeEventListener('pointermove', handleDragPointerMove);
    window.removeEventListener('pointerup', handleDragPointerUp);
    if (key && !moved) setPickedKey(key);
  };

  const activeTile = tiles.find(t => t.key === activeKey) ?? tiles[0] ?? null;
  const activeColor = activeTile ? EXERCISE_TYPE_COLORS[baseType(activeTile.key)] : '#60A5FA';
  const activeDates = useMemo(() => {
    if (!activeTile) return new Set<string>();
    return new Set(activities.filter(a => activityMatchesFavouriteKey(a, activeTile.key)).map(a => a.date));
  }, [activities, activeTile]);

  const usedKeys = new Set(draft.map(t => t.key));
  const pickableItems = allFavouriteItems().filter(i => !usedKeys.has(i.key) && i.label.toLowerCase().includes(search.toLowerCase()));
  const isEditingExistingTile = pickedKey !== null && draft.some(t => t.key === pickedKey);

  return (
    <div className="card mb-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wide">This Year</h2>
        {editing ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#475569]">{draft.length}/{MAX_YEAR_TOTAL_TILES}</span>
            <button onClick={cancelEditing} className="text-xs text-[#64748B] hover:text-white">Cancel</button>
            <button onClick={save} className="text-xs text-blue-400 hover:text-blue-300 font-semibold">Save</button>
          </div>
        ) : (
          <button onClick={startEditing} aria-label="Edit This Year tabs" className="text-[#64748B] hover:text-white transition-colors">
            <PencilDoodle />
          </button>
        )}
      </div>

      {editing ? (
        <>
          <p className="text-xs text-[#475569] mb-2">Tap a tab to edit it, drag to reorder</p>
          <div className="flex flex-wrap gap-3">
            {draft.map(tile => {
              const item = registry.get(tile.key);
              return (
                <div
                  key={tile.key}
                  data-tile-key={tile.key}
                  onPointerDown={handleDragPointerDown(tile.key)}
                  className={`relative select-none cursor-grab active:cursor-grabbing transition-opacity ${draggingKey === tile.key ? 'opacity-40' : ''}`}
                  style={{ touchAction: 'none' }}
                >
                  <div
                    title={item?.label ?? tile.key}
                    aria-label={item?.label ?? tile.key}
                    className="w-11 h-11 rounded-xl border border-[#334155] flex items-center justify-center text-[#94A3B8]"
                  >
                    <TabDoodle tileKey={tile.key} />
                  </div>
                  <button
                    onClick={() => removeTile(tile.key)}
                    aria-label={`Remove ${item?.label ?? tile.key}`}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#334155] text-[#94A3B8] hover:bg-red-900/60 hover:text-red-300 flex items-center justify-center"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
            {draft.length < MAX_YEAR_TOTAL_TILES && <AddTileButton onOpen={() => setPickedKey('')} />}
          </div>

          {pickedKey !== null && (
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPickedKey(null)} />
              <div className="relative w-full md:max-w-md max-h-[80vh] flex flex-col bg-[#1E293B] border border-[#334155] rounded-t-2xl md:rounded-2xl p-5">
                {!pickedKey ? (
                  <>
                    <h3 className="text-lg font-bold text-white mb-3">Add a tab</h3>
                    <input
                      autoFocus
                      className="input mb-3"
                      placeholder="Search sport or activity..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                    <div className="overflow-y-auto flex-1 flex flex-col gap-1 -mx-1 px-1">
                      {pickableItems.map(item => (
                        <button
                          key={item.key}
                          onClick={() => setPickedKey(item.key)}
                          className="flex items-center gap-2 text-left px-3 py-2 rounded-lg hover:bg-[#293548] text-sm text-white"
                        >
                          <span>{item.emoji}</span>
                          <span>{item.label}</span>
                        </button>
                      ))}
                      {pickableItems.length === 0 && <p className="text-sm text-[#64748B] px-3 py-2">No matches.</p>}
                    </div>
                    <button onClick={() => setPickedKey(null)} className="text-sm text-[#64748B] hover:text-white py-1 mt-3">Close</button>
                  </>
                ) : (
                  <>
                    <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-1">
                      <TabDoodle tileKey={pickedKey} className="text-[#94A3B8]" />
                      {registry.get(pickedKey)?.label}
                    </h3>
                    <p className="text-sm text-[#94A3B8] mb-4">What should this tab total? Used for both the Year and Month figures.</p>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => setTileMetric(pickedKey, 'distance')} className="btn-secondary text-sm py-2.5">Total distance (km)</button>
                      <button onClick={() => setTileMetric(pickedKey, 'count')} className="btn-secondary text-sm py-2.5">Activity count</button>
                      <button onClick={() => setTileMetric(pickedKey, 'both')} className="btn-secondary text-sm py-2.5">Both</button>
                    </div>
                    {isEditingExistingTile ? (
                      <button onClick={() => setPickedKey(null)} className="text-sm text-[#64748B] hover:text-white py-1 mt-3">Close</button>
                    ) : (
                      <button onClick={() => setPickedKey('')} className="text-sm text-[#64748B] hover:text-white py-1 mt-3">← Back</button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      ) : !activeTile ? (
        <p className="text-sm text-[#475569] flex items-center gap-1">No sports selected — tap <PencilDoodle size={14} /> to add one.</p>
      ) : (
        <>
          {/* Tab strip — one doodle icon per configured sport/subtype, scrolls horizontally if it overflows */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
            {tiles.map(tile => {
              const item = registry.get(tile.key);
              const active = tile.key === activeTile.key;
              return (
                <button
                  key={tile.key}
                  onClick={() => setActiveKey(tile.key)}
                  title={item?.label ?? tile.key}
                  aria-label={item?.label ?? tile.key}
                  className={`flex-shrink-0 w-11 h-11 rounded-xl border flex items-center justify-center transition-colors ${active ? 'bg-[#293548] border-blue-500 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}
                >
                  <TabDoodle tileKey={tile.key} />
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-1 text-white">
            <TabDoodle tileKey={activeTile.key} size={16} />
            <p className="text-sm font-semibold">{registry.get(activeTile.key)?.label}</p>
          </div>

          <div className="text-center mb-4">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">This Year</p>
            <p className="text-4xl font-extrabold text-white" style={{ fontFamily: 'var(--font-display)' }}>{displayValue(activeTile, yearActivities, 'year')}</p>
          </div>

          {/* Last 7 days (rolling, not the calendar week) — which days had this activity */}
          <div className="flex items-end justify-between gap-1.5 h-14 mb-1 px-2">
            {last7.map(day => (
              <div key={day.date} className="flex-1 h-full flex items-end justify-center">
                <div
                  className="w-full max-w-6 rounded-t"
                  style={{ height: activeDates.has(day.date) ? '100%' : '4px', background: activeDates.has(day.date) ? activeColor : '#334155' }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between gap-1.5 px-2 mb-5">
            {last7.map(day => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5">
                <span className="text-[10px] text-[#64748B]">{day.letter}</span>
                {day.isToday && <span className="text-orange-400 text-[8px] leading-none">▲</span>}
              </div>
            ))}
          </div>

          <div className="text-center">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">This Month</p>
            <p className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>{displayValue(activeTile, monthActivities, 'month')}</p>
          </div>
        </>
      )}
    </div>
  );
}

function AddTileButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      aria-label="Add a tab"
      className="w-11 h-11 rounded-xl border border-dashed border-[#334155] flex items-center justify-center text-[#64748B] hover:text-white hover:border-[#475569] transition-colors"
    >
      <Plus size={18} />
    </button>
  );
}
