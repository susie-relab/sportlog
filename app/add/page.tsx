'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import {
  ExerciseType, RunType,
  EXERCISE_TYPE_LABELS, RUN_TYPE_LABELS,
  EXERCISE_TYPE_COLORS, RUN_TYPE_COLORS,
  EXERCISE_TYPE_ORDER, RUN_TYPE_TERRAIN, RUN_TYPE_WORKOUT,
  SportSubType, SportFocus, SportStyle, GymSubType, WaterSubType, WaterStyle, SnowSubType, SnowStyle, SwimSubType, SwimFocus, SwimStyle, FitnessSubType, BikeSubType, StretchSubType, WalkSubType,
  SPORT_SUB_LABELS, SPORT_FOCUS_LABELS, SPORT_STYLE_LABELS, SPORT_STYLE_COLORS, GYM_SUB_LABELS, WATER_SUB_LABELS, WATER_STYLE_LABELS, SNOW_SUB_LABELS, SNOW_STYLE_LABELS, SWIM_SUB_LABELS, SWIM_FOCUS_LABELS, SWIM_STYLE_LABELS, SWIM_STYLE_COLORS, FITNESS_SUB_LABELS, BIKE_SUB_LABELS, STRETCH_SUB_LABELS, WALK_SUB_LABELS,
  suggestedMaxHr, suggestedAvgHr,
  Companion, COMPANION_LABELS, COMPANION_EMOJI, WeatherCondition, CONDITION_LABELS, CONDITION_EMOJI,
  Activity,
} from '@/types';
import TagToggleGrid from '@/components/TagToggleGrid';
import { COMPANION_ICON_OVERRIDES } from '@/lib/companionIcons';
import { CONDITION_ICON_OVERRIDES } from '@/lib/conditionIcons';
import { SUBTYPE_ICON_OVERRIDES } from '@/lib/subtypeIcons';
import { RUN_STYLE_ICON_OVERRIDES } from '@/lib/runStyleIcons';
import type { LucideIcon } from 'lucide-react';
import DistancePicker from '@/components/DistancePicker';
import ScrollFieldPicker from '@/components/ScrollFieldPicker';
import ImageUploader from '@/components/ImageUploader';
import { useDirtyForm } from '@/components/DirtyFormContext';
import { sessionParts, combineSessions, WEEKDAYS, isRunSession, todaysSession } from '@/lib/runPlanGenerator';
import ConfettiBurst from '@/components/ConfettiBurst';
import PbCelebrationModal from '@/components/PbCelebrationModal';
import ActivitySavedModal, { randomEncouragement } from '@/components/ActivitySavedModal';
import AccountSwitcher from '@/components/AccountSwitcher';
import { detectAutoPBs } from '@/lib/pbDetect';
import { todayLocalISO, openDatePicker, calcAge, formatDuration, formatDistance } from '@/lib/utils';

// Module-level helpers

function getSubLabel(type: string, sub: string): string {
  const maps: Record<string, Record<string, string>> = {
    sport: SPORT_SUB_LABELS as Record<string, string>,
    hiit: GYM_SUB_LABELS as Record<string, string>,
    water: WATER_SUB_LABELS as Record<string, string>,
    snow: SNOW_SUB_LABELS as Record<string, string>,
    swim: SWIM_SUB_LABELS as Record<string, string>,
    solo_fitness: FITNESS_SUB_LABELS as Record<string, string>,
    bike: BIKE_SUB_LABELS as Record<string, string>,
    walk: WALK_SUB_LABELS as Record<string, string>,
    stretch: STRETCH_SUB_LABELS as Record<string, string>,
  };
  return maps[type]?.[sub] || EXERCISE_TYPE_LABELS[type as ExerciseType] || sub;
}

function hrZoneInfo(hr: number, maxHr: number) {
  const pct = hr / maxHr;
  if (pct < 0.6) return { zone: 1, label: 'Zone 1 · easy recovery', color: '#22C55E' };
  if (pct < 0.7) return { zone: 2, label: 'Zone 2 · aerobic base', color: '#3B82F6' };
  if (pct < 0.8) return { zone: 3, label: 'Zone 3 · tempo', color: '#EAB308' };
  if (pct < 0.9) return { zone: 4, label: 'Zone 4 · threshold', color: '#F97316' };
  return { zone: 5, label: 'Zone 5 · max effort', color: '#EF4444' };
}

function effortHrHint(e: number | null, ageVal: number | null) {
  if (!e || !ageVal || ageVal < 10) return null;
  const maxHr = 220 - ageVal;
  const zones = [
    { zone: 1, low: 0.50, high: 0.60, label: 'easy aerobic', color: '#22C55E' },
    { zone: 2, low: 0.60, high: 0.70, label: 'aerobic', color: '#3B82F6' },
    { zone: 3, low: 0.70, high: 0.80, label: 'tempo', color: '#EAB308' },
    { zone: 4, low: 0.80, high: 0.90, label: 'threshold', color: '#F97316' },
    { zone: 5, low: 0.90, high: 1.00, label: 'max effort', color: '#EF4444' },
  ];
  const z = zones[e <= 2 ? 0 : e <= 4 ? 1 : e <= 6 ? 2 : e <= 8 ? 3 : 4];
  return { low: Math.round(maxHr * z.low), high: Math.round(maxHr * z.high), zone: z.zone, label: z.label, color: z.color };
}

function ColorDot({ color }: { color: string }) {
  return <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ background: color }} />;
}

function IconSubtypeButton({ label, subtypeKey, active, onClick, activeClass }: {
  label: string; subtypeKey: string; active: boolean; onClick: () => void; activeClass: string;
}) {
  const Icon = SUBTYPE_ICON_OVERRIDES[subtypeKey] as LucideIcon | undefined;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm font-medium border transition-all text-left ${
        active ? activeClass : 'border-transparent text-[#94A3B8] hover:text-white'
      }`}
    >
      {Icon && <Icon size={20} className="flex-shrink-0" />}
      <span className="truncate">{label}</span>
    </button>
  );
}

function BulletStyleOption({ label, active, onClick, color }: {
  label: string; active: boolean; onClick: () => void; color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-1 py-1.5 text-xs text-left transition-colors ${active ? 'text-white font-semibold' : 'text-[#94A3B8] hover:text-white'}`}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: active ? color : '#475569' }} />
      {label}
    </button>
  );
}

function DashedToggleButton({ label, hideLabel, expanded, onClick }: { label: string; hideLabel?: string; expanded: boolean; onClick: () => void }) {
  return (
    <div className="relative self-start w-fit">
      <button type="button" onClick={onClick}
        className="flex items-center gap-2 text-sm text-white hover:text-[#94A3B8] transition-colors px-2 py-0.5 border border-transparent rounded-lg">
        <span className="text-xs">{expanded ? '▼' : '▶'}</span>
        {expanded ? (hideLabel ?? label) : label}
      </button>
      {!expanded && (
        <svg aria-hidden className="absolute inset-0 w-full h-full pointer-events-none" style={{overflow:'visible'}}>
          {[13,38,63,88].map(p => (
            <line key={`l${p}`} x1="0" y1={`${p}%`} x2="-6" y2={`${p}%`} stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/>
          ))}
          <g style={{transform:'translateX(100%)', transformBox:'view-box' as never, transformOrigin:'0 0'}}>
            {[13,38,63,88].map(p => (
              <line key={`r${p}`} x1="0" y1={`${p}%`} x2="6" y2={`${p}%`} stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/>
            ))}
          </g>
          <line x1="0" y1="0" x2="-5" y2="-5" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/>
          <g style={{transform:'translateX(100%)', transformBox:'view-box' as never, transformOrigin:'0 0'}}>
            <line x1="0" y1="0" x2="5" y2="-5" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/>
          </g>
          <g style={{transform:'translateY(100%)', transformBox:'view-box' as never, transformOrigin:'0 0'}}>
            <line x1="0" y1="0" x2="-5" y2="5" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/>
          </g>
          <g style={{transform:'translate(100%, 100%)', transformBox:'view-box' as never, transformOrigin:'0 0'}}>
            <line x1="0" y1="0" x2="5" y2="5" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/>
          </g>
        </svg>
      )}
    </div>
  );
}

export default function AddPage() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [exerciseType, setExerciseType] = useState<ExerciseType | ''>('');
  const [runType, setRunType] = useState<RunType | ''>('');
  const [runTypeModifier, setRunTypeModifier] = useState<RunType | ''>('');
  const [subType, setSubType] = useState<string>('');
  const [gymTypes, setGymTypes] = useState<string[]>([]);
  const [walkTypes, setWalkTypes] = useState<string[]>([]);
  const [sportFocus, setSportFocus] = useState<SportFocus | ''>('');
  const [sportStyle, setSportStyle] = useState<SportStyle | ''>('');
  const [sportHomeAway, setSportHomeAway] = useState<'home' | 'away' | ''>('');
  const [swimFocus, setSwimFocus] = useState<SwimFocus | ''>('');
  const [swimStyles, setSwimStyles] = useState<string[]>([]);
  const [snowStyles, setSnowStyles] = useState<string[]>([]);
  const [waterStyles, setWaterStyles] = useState<string[]>([]);
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [conditions, setConditions] = useState<WeatherCondition[]>([]);
  const [hours, setHours] = useState('');
  const [mins, setMins] = useState('');
  const [secs, setSecs] = useState('');
  const [effort, setEffort] = useState<number | null>(null);
  const [distance, setDistance] = useState('');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageThumbs, setImageThumbs] = useState<string[]>([]);
  const [intensityMins, setIntensityMins] = useState('');
  const [paceMin, setPaceMin] = useState('');
  const [paceSec, setPaceSec] = useState('');
  const [maxPaceMin, setMaxPaceMin] = useState('');
  const [maxPaceSec, setMaxPaceSec] = useState('');
  const [maxHr, setMaxHr] = useState('');
  const [avgHr, setAvgHr] = useState('');
  const [elevationGain, setElevationGain] = useState('');
  const [isPb, setIsPb] = useState(false);
  const [pbDesc, setPbDesc] = useState('');
  const [date, setDate] = useState(todayLocalISO());
  const [showMore, setShowMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confettiColor, setConfettiColor] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pbCelebration, setPbCelebration] = useState<string[] | null>(null);
  const [savedTitle, setSavedTitle] = useState<string | null>(null);
  const { setDirty, showWarning, setShowWarning, pendingHref } = useDirtyForm();
  const router = useRouter();
  const [planLink, setPlanLink] = useState<{ planId: string; week: number; day: string; part?: number } | null>(null);
  const [fromDash, setFromDash] = useState(false);
  const [planCompleted, setPlanCompleted] = useState<{ planId: string; totalRuns: number; totalKm: number; totalMin: number } | null>(null);
  const [planMatchPrompt, setPlanMatchPrompt] = useState<{ planId: string; week: number; day: string; sessionTitle: string; activityId: string; distanceKm: number | null; durationMinutes: number; effort: number | null } | null>(null);
  const [duplicatePrompt, setDuplicatePrompt] = useState<{ existing: Activity; newId: string } | null>(null);
  const autoNavTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateFromModal = (path: string) => {
    if (autoNavTimeoutRef.current) clearTimeout(autoNavTimeoutRef.current);
    router.push(path);
  };
  const [showRepeatPicker, setShowRepeatPicker] = useState(false);
  const [recentActivities, setRecentActivities] = useState<Activity[] | null>(null);
  const [loadingRecent, setLoadingRecent] = useState(false);

  type QuickAddItem = { exerciseType: ExerciseType; subType: string; label: string; color: string };
  const [quickAddItems, setQuickAddItems] = useState<QuickAddItem[]>([]);
  const [showSurroundings, setShowSurroundings] = useState(false);
  const [showStyleFocus, setShowStyleFocus] = useState(false);
  const [feelingAfter, setFeelingAfter] = useState<number | null>(null);
  const [workoutVibes, setWorkoutVibes] = useState<string[]>([]);
  const [duplicateCheck, setDuplicateCheck] = useState<{ existing: Activity; onConfirm: () => void } | null>(null);
  const [quickAddFixed, setQuickAddFixed] = useState<QuickAddItem[] | null>(null); // null = auto mode
  const [editingQuickAdd, setEditingQuickAdd] = useState(false);
  const paceManuallyEdited = useRef(false);
  const nameManuallyEdited = useRef(false);

  // Prefill from query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('title'); if (t) setName(t);
    const type = params.get('type'); if (type) setExerciseType(type as ExerciseType);
    const rt = params.get('runType'); if (rt) setRunType(rt as RunType);
    const st = params.get('subType');
    if (st) { if (type === 'hiit') setGymTypes([st]); else setSubType(st); }
    const dist = params.get('distance'); if (dist) setDistance(dist);
    const time = params.get('time');
    if (time) { const m = parseInt(time); if (m > 0) { setHours(Math.floor(m / 60) ? String(Math.floor(m / 60)) : ''); setMins(m % 60 ? String(m % 60) : ''); } }
    const planId = params.get('planId'), week = params.get('week'), day = params.get('day');
    const part = params.get('part');
    if (planId && week && day) setPlanLink({ planId, week: parseInt(week), day, part: part != null ? parseInt(part) : undefined });
    if (params.get('from') === 'dash') setFromDash(true);
  }, []);

  const isDirty = !!(name || exerciseType || hours || mins || secs || distance || notes || effort || images.length);

  useEffect(() => {
    setDirty(isDirty);
    return () => setDirty(false);
  }, [isDirty, setDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Load the user's top 5 most-used exercise+subtype combos from the last 30 days
  useEffect(() => {
    if (!user) return;
    (async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const { data } = await supabase.from('activities')
        .select('exercise_type, sub_type, run_type')
        .eq('user_id', user.id)
        .gte('date', cutoff.toISOString().slice(0, 10))
        .order('date', { ascending: false })
        .limit(150);
      if (!data || data.length === 0) return;
      const counts = new Map<string, { exerciseType: ExerciseType; subType: string; count: number }>();
      for (const a of data) {
        const sub = a.exercise_type === 'run' ? (a.run_type || '') : (a.sub_type || '');
        const key = `${a.exercise_type}|${sub}`;
        const existing = counts.get(key);
        if (existing) existing.count++; else counts.set(key, { exerciseType: a.exercise_type as ExerciseType, subType: sub, count: 1 });
      }
      const top = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
      setQuickAddItems(top.map(item => {
        const isRun = item.exerciseType === 'run';
        const label = isRun && item.subType
          ? `${RUN_TYPE_LABELS[item.subType as RunType]} Run`
          : item.subType ? getSubLabel(item.exerciseType, item.subType) : EXERCISE_TYPE_LABELS[item.exerciseType];
        const color = isRun && item.subType ? RUN_TYPE_COLORS[item.subType as RunType] : EXERCISE_TYPE_COLORS[item.exerciseType];
        return { exerciseType: item.exerciseType, subType: item.subType, label, color };
      }));
    })();
  }, [user]);

  const durationSeconds = (parseInt(hours || '0') * 3600) + (parseInt(mins || '0') * 60) + parseInt(secs || '0');
  const durationMinutes = Math.floor(durationSeconds / 60);
  const durationExtraSeconds = durationSeconds % 60;

  const normalizeDuration = () => {
    let h = parseInt(hours || '0');
    let m = parseInt(mins || '0');
    let s = parseInt(secs || '0');
    if (s >= 60) { m += Math.floor(s / 60); s = s % 60; }
    if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
    setHours(h ? String(h) : '');
    setMins(m ? String(m) : '');
    setSecs(s ? String(s) : '');
  };

  // Auto-fill avg pace when distance + duration change (unless user has manually edited pace)
  useEffect(() => {
    if (paceManuallyEdited.current) return;
    const dec = calcAutoPace(distance, durationSeconds);
    if (dec) {
      setPaceMin(String(Math.floor(dec)));
      setPaceSec(String(Math.round((dec % 1) * 60)).padStart(2, '0'));
    } else {
      setPaceMin('');
      setPaceSec('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distance, durationSeconds]);

  useEffect(() => {
    if (nameManuallyEdited.current) return;
    if (!exerciseType) { setName(''); return; }
    const isRun = exerciseType === 'run';
    const sub = isRun ? runType : subType;
    let autoName = '';
    if (isRun && runType) {
      autoName = `${RUN_TYPE_LABELS[runType as RunType]} Run`;
    } else if (sub) {
      autoName = getSubLabel(exerciseType, sub);
    } else {
      autoName = EXERCISE_TYPE_LABELS[exerciseType] || '';
    }
    setName(autoName);
  }, [exerciseType, runType, subType]);

  const paceToDecimal = (m: string, s: string) => {
    if (!m && !s) return undefined;
    return parseFloat(m || '0') + parseFloat(s || '0') / 60;
  };

  const calcAutoPace = (distStr: string, totalDurationSeconds: number) => {
    const dist = parseFloat(distStr);
    if (!dist || dist <= 0 || totalDurationSeconds <= 0) return undefined;
    return Math.round((totalDurationSeconds / 60 / dist) * 1000) / 1000;
  };

  const toggleCompanion = (key: Companion) => setCompanions(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  const toggleCondition = (key: WeatherCondition) => setConditions(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const openRepeatPicker = async () => {
    setShowRepeatPicker(true);
    if (recentActivities !== null || !user) return;
    setLoadingRecent(true);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffISO = cutoff.toISOString().slice(0, 10);
    const { data } = await supabase.from('activities').select('*')
      .eq('user_id', user.id).gte('date', cutoffISO).order('date', { ascending: false }).limit(50);
    setRecentActivities((data as Activity[]) || []);
    setLoadingRecent(false);
  };

  const applyRecentActivity = (a: Activity) => {
    setName(a.name);
    setExerciseType(a.exercise_type);
    setRunType(a.run_type || '');
    setRunTypeModifier(a.run_type_modifier || '');
    if (a.exercise_type === 'hiit') { setGymTypes(a.sub_type ? a.sub_type.split(',') : []); setWalkTypes([]); setSubType(''); }
    else if (a.exercise_type === 'walk') { setWalkTypes(a.sub_type ? a.sub_type.split(',') : []); setGymTypes([]); setSubType(''); }
    else { setSubType(a.sub_type || ''); setGymTypes([]); setWalkTypes([]); }
    setSportFocus(a.sport_focus || '');
    setSportStyle(a.sport_style || '');
    setSportHomeAway((a.sport_home_away as 'home' | 'away') || '');
    setSwimFocus(a.swim_focus || '');
    setSwimStyles(a.swim_styles ? a.swim_styles.split(',') : []);
    setSnowStyles(a.snow_styles ? a.snow_styles.split(',') : []);
    setWaterStyles(a.water_styles ? a.water_styles.split(',') : []);
    setCompanions(a.companions ? a.companions.split(',') as Companion[] : []);
    setConditions(a.conditions ? a.conditions.split(',') as WeatherCondition[] : []);
    const totalSec = a.duration_minutes * 60 + (a.duration_seconds || 0);
    setHours(Math.floor(totalSec / 3600) ? String(Math.floor(totalSec / 3600)) : '');
    setMins(Math.floor((totalSec % 3600) / 60) ? String(Math.floor((totalSec % 3600) / 60)) : '');
    setSecs(totalSec % 60 ? String(totalSec % 60) : '');
    setEffort(a.effort);
    setDistance(a.distance_km != null ? (a.exercise_type === 'swim' ? String(Math.round(a.distance_km * 1000)) : String(a.distance_km)) : '');
    setIntensityMins(a.intensity_minutes != null ? String(a.intensity_minutes) : '');
    if (a.pace_min_km != null) { setPaceMin(String(Math.floor(a.pace_min_km))); setPaceSec(String(Math.round((a.pace_min_km % 1) * 60))); } else { setPaceMin(''); setPaceSec(''); }
    if (a.max_pace_min_km != null) { setMaxPaceMin(String(Math.floor(a.max_pace_min_km))); setMaxPaceSec(String(Math.round((a.max_pace_min_km % 1) * 60))); } else { setMaxPaceMin(''); setMaxPaceSec(''); }
    setMaxHr(a.max_hr != null ? String(a.max_hr) : '');
    setAvgHr(a.avg_hr != null ? String(a.avg_hr) : '');
    setElevationGain(a.elevation_gain_m != null ? String(a.elevation_gain_m) : '');
    if (a.sport_focus || a.sport_style || a.swim_focus || a.swim_styles || a.snow_styles || a.water_styles) setShowStyleFocus(true);
    if (a.companions || a.conditions) setShowSurroundings(true);
    if (a.pace_min_km != null || a.max_pace_min_km != null || a.max_hr != null || a.avg_hr != null || a.intensity_minutes != null || a.elevation_gain_m != null) setShowMore(true);
    setShowRepeatPicker(false);
  };

  const applyQuickAdd = (item: QuickAddItem) => {
    setExerciseType(item.exerciseType);
    setRunType(''); setRunTypeModifier(''); setSubType('');
    setGymTypes([]); setWalkTypes([]);
    setSportFocus(''); setSportStyle(''); setSportHomeAway('');
    setSwimFocus(''); setSwimStyles([]); setSnowStyles([]); setWaterStyles([]);
    if (item.exerciseType === 'run') setRunType(item.subType as RunType);
    else if (item.exerciseType === 'hiit') setGymTypes(item.subType ? [item.subType] : []);
    else if (item.exerciseType === 'walk') setWalkTypes(item.subType ? [item.subType] : []);
    else setSubType(item.subType);
  };

  const accentColor = exerciseType === 'run' && runType
    ? RUN_TYPE_COLORS[runType]
    : exerciseType
    ? EXERCISE_TYPE_COLORS[exerciseType]
    : '#3B82F6';

  const doSave = useCallback(async () => {
    setSaving(true);
    const distanceKm = distance ? (exerciseType === 'swim' ? parseFloat(distance) / 1000 : parseFloat(distance)) : null;
    const paceMinKm = paceToDecimal(paceMin, paceSec) ?? calcAutoPace(String(distanceKm ?? ''), durationSeconds) ?? null;
    const subTypeValue = exerciseType === 'hiit' ? gymTypes.join(',') || null : exerciseType === 'walk' ? walkTypes.join(',') || null : subType || null;

    const { data: inserted, error: dbErr } = await supabase.from('activities').insert({
      user_id: user!.id,
      name: name.trim(),
      exercise_type: exerciseType,
      run_type: exerciseType === 'run' ? runType || null : null,
      run_type_modifier: exerciseType === 'run' ? runTypeModifier || null : null,
      sub_type: subTypeValue,
      sport_focus: exerciseType === 'sport' ? sportFocus || null : null,
      sport_style: exerciseType === 'sport' ? sportStyle || null : null,
      sport_home_away: exerciseType === 'sport' && sportFocus === 'game' ? sportHomeAway || null : null,
      swim_focus: exerciseType === 'swim' ? swimFocus || null : null,
      swim_styles: exerciseType === 'swim' ? swimStyles.join(',') || null : null,
      snow_styles: exerciseType === 'snow' ? snowStyles.join(',') || null : null,
      water_styles: exerciseType === 'water' ? waterStyles.join(',') || null : null,
      companions: companions.join(',') || null,
      conditions: conditions.join(',') || null,
      duration_minutes: durationMinutes,
      duration_seconds: durationExtraSeconds,
      effort,
      distance_km: distanceKm,
      notes: notes || null,
      intensity_minutes: intensityMins ? parseInt(intensityMins) : null,
      pace_min_km: paceMinKm,
      max_pace_min_km: paceToDecimal(maxPaceMin, maxPaceSec),
      max_hr: maxHr ? parseInt(maxHr) : null,
      avg_hr: avgHr ? parseInt(avgHr) : null,
      elevation_gain_m: elevationGain ? parseInt(elevationGain) : null,
      is_pb: isPb,
      pb_description: isPb ? pbDesc : null,
      image_urls: images.length ? images : null,
      thumbnail_urls: imageThumbs.length ? imageThumbs : null,
      feeling_after: feelingAfter,
      workout_vibes: workoutVibes.length > 0 ? workoutVibes : null,
      date,
    }).select('id').single();

    let autoReasons: string[] = [];
    if (!dbErr && inserted?.id) {
      const { data: prior } = await supabase.from('activities')
        .select('exercise_type,distance_km,pace_min_km,duration_minutes,run_type,run_type_modifier,sub_type')
        .eq('user_id', user!.id)
        .neq('id', inserted.id)
        .or(`exercise_type.eq.${exerciseType},distance_km.not.is.null`);
      autoReasons = detectAutoPBs(
        { exercise_type: exerciseType as ExerciseType, distance_km: distanceKm ?? undefined, pace_min_km: paceMinKm ?? undefined, duration_minutes: durationMinutes, run_type: exerciseType === 'run' ? (runType as RunType || undefined) : undefined, run_type_modifier: exerciseType === 'run' ? (runTypeModifier as RunType || undefined) : undefined, sub_type: subTypeValue ?? undefined },
        prior || [],
      );
      if (!isPb && autoReasons.length > 0) {
        await supabase.from('activities').update({ is_pb: true, pb_auto: true, pb_description: autoReasons.join(' · ') }).eq('id', inserted.id);
      }
    }
    const pbReasons = isPb && pbDesc.trim() ? [pbDesc.trim(), ...autoReasons] : autoReasons;

    if (!dbErr && planLink) {
      const { data: planRow } = await supabase.from('training_plans').select('plan_data').eq('id', planLink.planId).single();
      if (planRow?.plan_data) {
        const pd = planRow.plan_data;
        const wk = pd.weeks.find((w: { weekNumber: number }) => w.weekNumber === planLink.week);
        if (wk && wk.days[planLink.day]) {
          const parts = sessionParts(wk.days[planLink.day]);
          const idx = planLink.part != null && planLink.part < parts.length ? planLink.part : 0;
          const newParts = parts.map((p, i) => i === idx ? {
            ...p, completed: true, completedActivityId: inserted?.id ?? null,
            completedDistanceKm: distanceKm ?? null, completedTimeMin: durationMinutes || null, completedEffort: effort,
          } : p);
          wk.days[planLink.day] = newParts.length === 1 ? newParts[0] : combineSessions(newParts);
          await supabase.from('training_plans').update({ plan_data: pd, updated_at: new Date().toISOString() }).eq('id', planLink.planId);

          const totalRuns = pd.weeks.reduce((s: number, w: typeof wk) => s + WEEKDAYS.filter(d => isRunSession(w.days[d])).length, 0);
          const runsCompleted = pd.weeks.reduce((s: number, w: typeof wk) => s + WEEKDAYS.filter(d => w.days[d].completed).length, 0);
          if (totalRuns > 0 && runsCompleted >= totalRuns) {
            const totalKm = pd.weeks.reduce((s: number, w: typeof wk) => s + WEEKDAYS.reduce((k: number, d) => k + (isRunSession(w.days[d]) ? (w.days[d].distanceKm || 0) : 0), 0), 0);
            const totalMin = pd.weeks.reduce((s: number, w: typeof wk) => s + WEEKDAYS.reduce((m: number, d) => m + (isRunSession(w.days[d]) ? (w.days[d].timeMin || 0) : 0), 0), 0);
            setPlanCompleted({ planId: planLink.planId, totalRuns, totalKm, totalMin });
          }
        }
      }
      setPlanLink(null);
    }

    if (!dbErr && inserted?.id && !planLink && !fromDash) {
      const { data: plans } = await supabase
        .from('training_plans')
        .select('id, plan_data, start_date, weeks')
        .eq('user_id', user!.id);
      if (plans) {
        for (const plan of plans) {
          const pos = todaysSession(plan, date);
          if (pos && !pos.session.completed && pos.session.exerciseType === exerciseType) {
            setPlanMatchPrompt({
              planId: plan.id,
              week: pos.week,
              day: pos.day,
              sessionTitle: pos.session.title || exerciseType,
              activityId: inserted.id,
              distanceKm: distanceKm,
              durationMinutes: durationMinutes || 0,
              effort,
            });
            break;
          }
        }
      }
    }

    if (!dbErr && inserted?.id) {
      const { data: sameDay } = await supabase
        .from('activities')
        .select('id, name, exercise_type, duration_minutes, distance_km, sub_type')
        .eq('user_id', user!.id)
        .eq('date', date)
        .eq('exercise_type', exerciseType)
        .neq('id', inserted.id)
        .limit(1);
      if (sameDay && sameDay.length > 0) {
        setDuplicatePrompt({ existing: sameDay[0] as Activity, newId: inserted.id });
      }
    }

    setSaving(false);

    if (dbErr) {
      setError(dbErr.message);
    } else {
      setConfettiColor(accentColor);
      setTimeout(() => setConfettiColor(null), 2200);
      if (isPb || pbReasons.length > 0) setPbCelebration(pbReasons);
      else setSavedTitle(randomEncouragement());
      setName(''); setExerciseType(''); setRunType(''); setRunTypeModifier(''); setSubType(''); setGymTypes([]); setWalkTypes([]); setSportFocus(''); setSportStyle(''); setSportHomeAway(''); setSwimFocus(''); setSwimStyles([]); setSnowStyles([]); setWaterStyles([]); setCompanions([]); setConditions([]); setHours(''); setMins(''); setSecs('');
      setEffort(null); setDistance(''); setNotes(''); setIntensityMins('');
      setPaceMin(''); setPaceSec(''); setMaxPaceMin(''); setMaxPaceSec('');
      setMaxHr(''); setAvgHr(''); setElevationGain(''); setIsPb(false); setPbDesc('');
      setImages([]); setImageThumbs([]);
      setFeelingAfter(null);
      setWorkoutVibes([]);
      setDate(todayLocalISO());
      setShowMore(false);
      setShowSurroundings(false);
      paceManuallyEdited.current = false;
      nameManuallyEdited.current = false;
      setShowStyleFocus(false);

      if (planCompleted) {
        autoNavTimeoutRef.current = setTimeout(() => router.push(`/training-plan?plan=${planCompleted.planId}&celebrate=1`), 1800);
      } else if (fromDash) {
        autoNavTimeoutRef.current = setTimeout(() => router.push('/dash'), 1800);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, distance, exerciseType, paceMin, paceSec, durationSeconds, gymTypes, walkTypes, subType, name, runType, runTypeModifier, sportFocus, sportStyle, sportHomeAway, swimFocus, swimStyles, snowStyles, waterStyles, companions, conditions, durationMinutes, durationExtraSeconds, effort, notes, intensityMins, maxPaceMin, maxPaceSec, maxHr, avgHr, elevationGain, isPb, pbDesc, images, imageThumbs, feelingAfter, workoutVibes, date, planLink, fromDash, accentColor, planCompleted]);

  const handleSave = async () => {
    const issues: string[] = [];
    if (!name.trim()) issues.push('enter an activity name');
    if (!exerciseType) issues.push('select an exercise type');
    if (durationSeconds <= 0) issues.push('enter a valid duration');
    if (!effort) issues.push('select an effort level');
    if (issues.length > 0) {
      const joined = issues.length === 1 ? issues[0]
        : issues.length === 2 ? `${issues[0]} and ${issues[1]}`
        : `${issues.slice(0, -1).join(', ')}, and ${issues[issues.length - 1]}`;
      return setError(`Please ${joined}.`);
    }

    setSaving(true);
    setError('');

    const { data: sameDay } = await supabase
      .from('activities')
      .select('id, name, exercise_type, sub_type, run_type, duration_seconds, effort, date')
      .eq('user_id', user!.id)
      .eq('date', date)
      .eq('exercise_type', exerciseType)
      .maybeSingle();

    if (sameDay) {
      setSaving(false);
      setDuplicateCheck({ existing: sameDay as Activity, onConfirm: doSave });
      return;
    }
    await doSave();
  };

  const dismissDuplicate = async (deleteId: string) => {
    await supabase.from('activities').delete().eq('id', deleteId);
    setDuplicatePrompt(null);
  };

  const applyPlanMatch = async () => {
    if (!planMatchPrompt) return;
    const { planId, week, day, activityId, distanceKm: matchDist, durationMinutes: matchDur, effort: matchEffort } = planMatchPrompt;
    const { data: planRow } = await supabase.from('training_plans').select('plan_data').eq('id', planId).single();
    if (planRow?.plan_data) {
      const pd = planRow.plan_data;
      const wk = pd.weeks.find((w: { weekNumber: number }) => w.weekNumber === week);
      if (wk && wk.days[day]) {
        const parts = sessionParts(wk.days[day]);
        const newParts = parts.map((p, i) => i === 0 ? {
          ...p, completed: true, completedActivityId: activityId,
          completedDistanceKm: matchDist ?? null, completedTimeMin: matchDur || null, completedEffort: matchEffort,
        } : p);
        wk.days[day] = newParts.length === 1 ? newParts[0] : combineSessions(newParts);
        await supabase.from('training_plans').update({ plan_data: pd, updated_at: new Date().toISOString() }).eq('id', planId);
      }
    }
    setPlanMatchPrompt(null);
  };

  const age = user?.user_metadata?.birthday ? calcAge(user.user_metadata.birthday) : null;
  const maxHrEstimate = age ? 220 - age : null;
  const autoPaceDecimal = calcAutoPace(distance, durationSeconds);
  const autoPaceMinVal = autoPaceDecimal ? Math.floor(autoPaceDecimal) : null;
  const autoPaceSecVal = autoPaceDecimal ? Math.round((autoPaceDecimal % 1) * 60) : null;
  const progressCount = [!!name.trim(), !!exerciseType, durationSeconds > 0, !!effort, !!distance, !!notes.trim()].filter(Boolean).length;

  return (
    <div className="max-w-lg md:max-w-4xl mx-auto relative">
      <div className="absolute top-0 right-0 z-10">
        <AccountSwitcher compact />
      </div>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap pr-24 sm:pr-32">
        <h1 className="text-xl font-bold text-white">Add Exercise</h1>
        <button type="button" onClick={openRepeatPicker} className="text-sm text-blue-400 hover:text-blue-300">
          ↻ Repeat a recent activity
        </button>
      </div>
      {(() => {
        const displayItems = (quickAddFixed ?? quickAddItems).filter(i => !!i.subType);
        if (displayItems.length === 0 && !editingQuickAdd) return null;
        return (
          <div className="mb-4">
            <div className="flex gap-2 flex-wrap items-center">
              {displayItems.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => !editingQuickAdd && applyQuickAdd(item)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    editingQuickAdd
                      ? 'border-[#334155] text-[#64748B]'
                      : 'border-[#334155] text-[#94A3B8] hover:border-[#475569] hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  {item.label}
                  {editingQuickAdd && quickAddFixed && (
                    <span
                      className="ml-1 text-[#64748B] hover:text-red-400 cursor-pointer"
                      onClick={e => { e.stopPropagation(); setQuickAddFixed(quickAddFixed.filter((_, idx) => idx !== i)); }}
                    >✕</span>
                  )}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setEditingQuickAdd(v => !v)}
                className="text-xs text-[#475569] hover:text-[#94A3B8] transition-colors ml-auto"
              >
                {editingQuickAdd ? 'Done' : '⚙ Edit'}
              </button>
            </div>
            {editingQuickAdd && (
              <div className="mt-2 p-3 rounded-lg border border-[#334155] bg-[#1E293B] flex flex-col gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => { setQuickAddFixed(null); setEditingQuickAdd(false); }}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all ${!quickAddFixed ? 'border-blue-500/50 bg-blue-500/10 text-blue-300' : 'border-[#334155] text-[#64748B] hover:border-[#475569]'}`}
                >
                  <span>🔄</span> Auto adjust from last 30 days
                </button>
                <button
                  type="button"
                  onClick={() => { if (!quickAddFixed) setQuickAddFixed([...quickAddItems.filter(i => !!i.subType)]); }}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all ${quickAddFixed ? 'border-blue-500/50 bg-blue-500/10 text-blue-300' : 'border-[#334155] text-[#64748B] hover:border-[#475569]'}`}
                >
                  <span>📌</span> Fix these choices (remove ✕ to drop one)
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {confettiColor && <ConfettiBurst color={confettiColor} />}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-6 pb-28">

        {/* ── TOP ROW: 2-col on desktop ── */}
        <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-x-8 md:items-start">

          {/* LEFT: Name · Date · Exercise Type · Subtypes */}
          <div className="flex flex-col gap-4">

        {/* Name */}
        <div>
          <label className="label">Activity Name *</label>
          <input className="input" placeholder="e.g. Morning Run" value={name} onChange={e => { nameManuallyEdited.current = true; setName(e.target.value); }} />
        </div>

        {/* Date */}
        <div>
          <label className="label">Date *</label>
          <input type="date" className="input" value={date} onClick={openDatePicker} onChange={e => setDate(e.target.value)} />
        </div>

        {/* Exercise Type */}
        <div>
          <label className="label">Exercise Session *</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {EXERCISE_TYPE_ORDER.map(type => (
              <button
                key={type}
                onClick={() => { setExerciseType(type); setRunType(''); setRunTypeModifier(''); setSubType(''); setGymTypes([]); setWalkTypes([]); setSportFocus(''); setSportStyle(''); setSwimFocus(''); setSwimStyles([]); setSnowStyles([]); setWaterStyles([]); }}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium border transition-all text-left ${
                  exerciseType === type
                    ? 'border-2 text-white'
                    : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
                }`}
                style={exerciseType === type ? {
                  borderColor: EXERCISE_TYPE_COLORS[type],
                  background: EXERCISE_TYPE_COLORS[type] + '22',
                } : {}}
              >
                <ColorDot color={EXERCISE_TYPE_COLORS[type]} />
                {EXERCISE_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Run Type and Run Style */}
        {exerciseType === 'run' && (
          <div>
            <label className="label">Run Type <span className="text-[#64748B]">(optional)</span></label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {RUN_TYPE_WORKOUT.map(type => (
                <button
                  key={type}
                  onClick={() => setRunType(runType === type ? '' : type)}
                  className={`flex items-center px-2 py-1.5 rounded-lg text-sm font-medium border transition-all text-left ${
                    runType === type
                      ? 'border-2 text-white'
                      : 'border-transparent text-[#94A3B8] hover:text-white'
                  }`}
                  style={runType === type ? {
                    borderColor: RUN_TYPE_COLORS[type],
                    background: RUN_TYPE_COLORS[type] + '33',
                  } : {}}
                >
                  <ColorDot color={RUN_TYPE_COLORS[type]} />
                  {RUN_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <DashedToggleButton label="Run Style" hideLabel="Hide Run Style" expanded={showStyleFocus} onClick={() => setShowStyleFocus(v => !v)} />
            </div>
            {showStyleFocus && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {RUN_TYPE_TERRAIN.map(type => {
                  const RunStyleIcon = RUN_STYLE_ICON_OVERRIDES[type];
                  return (
                    <button
                      key={type}
                      onClick={() => setRunTypeModifier(runTypeModifier === type ? '' : type)}
                      className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium border transition-all text-left ${
                        runTypeModifier === type ? 'border-2 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
                      }`}
                      style={runTypeModifier === type ? { borderColor: RUN_TYPE_COLORS[type], background: RUN_TYPE_COLORS[type] + '33' } : {}}
                    >
                      {RunStyleIcon && <RunStyleIcon size={16} className="flex-shrink-0 mr-2" style={{ color: RUN_TYPE_COLORS[type] }} />}
                      {RUN_TYPE_LABELS[type]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Sport subtype */}
        {exerciseType === 'sport' && (
          <div>
            <label className="label">Sport Type <span className="text-[#64748B]">(optional)</span></label>
            <div className="grid grid-cols-2 gap-0.5">
              {(Object.keys(SPORT_SUB_LABELS) as SportSubType[]).map(t => (
                <IconSubtypeButton key={t} label={SPORT_SUB_LABELS[t]} subtypeKey={t} active={subType === t}
                  onClick={() => setSubType(subType === t ? '' : t)} activeClass="border-orange-500 bg-orange-500/20 text-white" />
              ))}
            </div>
            <div className="mt-3">
              <DashedToggleButton label="Sport Focus & Style" hideLabel="Hide Sport Focus & Style" expanded={showStyleFocus} onClick={() => setShowStyleFocus(v => !v)} />
            </div>
            {showStyleFocus && (
              <>
                <label className="label mt-3">Sport Focus <span className="text-[#64748B]">(optional)</span></label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.keys(SPORT_FOCUS_LABELS) as SportFocus[]).map(t => (
                    <button key={t} onClick={() => setSportFocus(sportFocus === t ? '' : t)}
                      className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all text-center ${sportFocus === t ? 'border-orange-500 bg-orange-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
                      {SPORT_FOCUS_LABELS[t]}
                    </button>
                  ))}
                </div>
                {sportFocus === 'game' && (
                  <>
                    <label className="label mt-3">Home or Away? <span className="text-[#64748B]">(optional)</span></label>
                    <div className="flex gap-2">
                      {(['home', 'away'] as const).map(v => (
                        <button key={v} onClick={() => setSportHomeAway(sportHomeAway === v ? '' : v)}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all capitalize ${sportHomeAway === v ? 'border-orange-500 bg-orange-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
                          {v === 'home' ? '🏠 Home' : '✈️ Away'}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <label className="label mt-3">Sport Style <span className="text-[#64748B]">(optional)</span></label>
                <div className="grid grid-cols-2 gap-1">
                  {(Object.keys(SPORT_STYLE_LABELS) as SportStyle[]).map(t => (
                    <BulletStyleOption key={t} label={SPORT_STYLE_LABELS[t]} active={sportStyle === t}
                      onClick={() => setSportStyle(sportStyle === t ? '' : t)} color={SPORT_STYLE_COLORS[t]} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Gym subtype */}
        {exerciseType === 'hiit' && (
          <div>
            <label className="label">Workout Focus <span className="text-[#64748B]">(optional + multi-select)</span></label>
            <div className="grid grid-cols-2 gap-0.5">
              {(Object.keys(GYM_SUB_LABELS) as GymSubType[]).map(t => {
                const active = gymTypes.includes(t);
                return (
                  <IconSubtypeButton key={t} label={GYM_SUB_LABELS[t]} subtypeKey={t} active={active}
                    onClick={() => setGymTypes(active ? gymTypes.filter(x => x !== t) : [...gymTypes, t])} activeClass="border-red-500 bg-red-500/20 text-white" />
                );
              })}
            </div>
          </div>
        )}

        {/* Water */}
        {exerciseType === 'water' && (
          <div>
            <label className="label">Activity <span className="text-[#64748B]">(optional)</span></label>
            <div className="grid grid-cols-2 gap-0.5">
              {(Object.keys(WATER_SUB_LABELS) as WaterSubType[]).map(t => (
                <IconSubtypeButton key={t} label={WATER_SUB_LABELS[t]} subtypeKey={t} active={subType === t}
                  onClick={() => setSubType(subType === t ? '' : t)} activeClass="border-sky-500 bg-sky-500/20 text-white" />
              ))}
            </div>
            <div className="mt-3">
              <DashedToggleButton label="Water Style" hideLabel="Hide Water Style" expanded={showStyleFocus} onClick={() => setShowStyleFocus(v => !v)} />
            </div>
            {showStyleFocus && (
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {(Object.keys(WATER_STYLE_LABELS) as WaterStyle[]).map(t => {
                  const active = waterStyles.includes(t);
                  return (
                    <button key={t} onClick={() => setWaterStyles(active ? waterStyles.filter(x => x !== t) : [...waterStyles, t])}
                      className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all text-center ${active ? 'border-sky-500 bg-sky-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
                      {WATER_STYLE_LABELS[t]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Snow */}
        {exerciseType === 'snow' && (
          <div>
            <label className="label">Activity <span className="text-[#64748B]">(optional)</span></label>
            <div className="grid grid-cols-2 gap-0.5">
              {(Object.keys(SNOW_SUB_LABELS) as SnowSubType[]).map(t => (
                <IconSubtypeButton key={t} label={SNOW_SUB_LABELS[t]} subtypeKey={t} active={subType === t}
                  onClick={() => setSubType(subType === t ? '' : t)} activeClass="border-sky-500 bg-sky-500/20 text-white" />
              ))}
            </div>
            <div className="mt-3">
              <DashedToggleButton label="Snow Style" hideLabel="Hide Snow Style" expanded={showStyleFocus} onClick={() => setShowStyleFocus(v => !v)} />
            </div>
            {showStyleFocus && (
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {(Object.keys(SNOW_STYLE_LABELS) as SnowStyle[]).map(t => {
                  const active = snowStyles.includes(t);
                  return (
                    <button key={t} onClick={() => setSnowStyles(active ? snowStyles.filter(x => x !== t) : [...snowStyles, t])}
                      className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all text-center ${active ? 'border-sky-500 bg-sky-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
                      {SNOW_STYLE_LABELS[t]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Swim */}
        {exerciseType === 'swim' && (
          <div>
            <label className="label">Swim Type <span className="text-[#64748B]">(optional)</span></label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(SWIM_SUB_LABELS) as SwimSubType[]).map(t => (
                <IconSubtypeButton key={t} label={SWIM_SUB_LABELS[t]} subtypeKey={t} active={subType === t}
                  onClick={() => setSubType(subType === t ? '' : t)} activeClass="border-cyan-500 bg-cyan-500/20 text-white" />
              ))}
            </div>
            <div className="mt-3">
              <DashedToggleButton label="Swim Focus & Style" hideLabel="Hide Swim Focus & Style" expanded={showStyleFocus} onClick={() => setShowStyleFocus(v => !v)} />
            </div>
            {showStyleFocus && (
              <>
                <label className="label mt-3">Swim Focus <span className="text-[#64748B]">(optional)</span></label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(SWIM_FOCUS_LABELS) as SwimFocus[]).map(t => (
                    <button key={t} onClick={() => setSwimFocus(swimFocus === t ? '' : t)}
                      className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all text-center ${swimFocus === t ? 'border-cyan-500 bg-cyan-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
                      {SWIM_FOCUS_LABELS[t]}
                    </button>
                  ))}
                </div>
                <label className="label mt-3">Swim Style <span className="text-[#64748B]">(optional + multi-select)</span></label>
                <div className="grid grid-cols-2 gap-1">
                  {(Object.keys(SWIM_STYLE_LABELS) as SwimStyle[]).map(t => {
                    const active = swimStyles.includes(t);
                    return (
                      <BulletStyleOption key={t} label={SWIM_STYLE_LABELS[t]} active={active}
                        onClick={() => setSwimStyles(active ? swimStyles.filter(x => x !== t) : [...swimStyles, t])} color={SWIM_STYLE_COLORS[t]} />
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {exerciseType === 'solo_fitness' && (
          <div>
            <label className="label">Activity Type <span className="text-[#64748B]">(optional)</span></label>
            <div className="grid grid-cols-2 gap-0.5">
              {(Object.keys(FITNESS_SUB_LABELS) as FitnessSubType[]).map(t => (
                <IconSubtypeButton key={t} label={FITNESS_SUB_LABELS[t]} subtypeKey={t} active={subType === t}
                  onClick={() => setSubType(subType === t ? '' : t)} activeClass="border-purple-500 bg-purple-500/20 text-white" />
              ))}
            </div>
          </div>
        )}
        {exerciseType === 'bike' && (
          <div>
            <label className="label">Ride Type <span className="text-[#64748B]">(optional)</span></label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(BIKE_SUB_LABELS) as BikeSubType[]).map(t => (
                <button key={t} onClick={() => setSubType(subType === t ? '' : t)}
                  className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all text-center ${subType === t ? 'border-yellow-500 bg-yellow-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
                  {BIKE_SUB_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        )}
        {exerciseType === 'walk' && (
          <div>
            <label className="label">Walk Type <span className="text-[#64748B]">(optional + multi-select)</span></label>
            <div className="grid grid-cols-2 gap-0.5">
              {(Object.keys(WALK_SUB_LABELS) as WalkSubType[]).map(t => {
                const active = walkTypes.includes(t);
                return (
                  <IconSubtypeButton key={t} label={WALK_SUB_LABELS[t]} subtypeKey={t} active={active}
                    onClick={() => setWalkTypes(active ? walkTypes.filter(x => x !== t) : [...walkTypes, t])} activeClass="border-orange-500 bg-orange-500/20 text-white" />
                );
              })}
            </div>
          </div>
        )}
        {exerciseType === 'stretch' && (
          <div>
            <label className="label">Stretch Type <span className="text-[#64748B]">(optional)</span></label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(STRETCH_SUB_LABELS) as StretchSubType[]).map(t => (
                <button key={t} onClick={() => setSubType(subType === t ? '' : t)}
                  className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all text-center ${subType === t ? 'border-green-500 bg-green-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
                  {STRETCH_SUB_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        )}

          </div>{/* end LEFT col */}

          {/* RIGHT: Duration · Effort · Distance · More optional details */}
          <div className="flex flex-col gap-4">

        {/* Duration */}
        <div>
          <label className="label">Duration *</label>
          <div className="flex gap-3">
            <div className="flex-1">
              <input type="number" className="input" placeholder="Hours" min="0" value={hours} onChange={e => setHours(e.target.value)} onBlur={normalizeDuration} />
            </div>
            <div className="flex-1">
              <input type="number" className="input" placeholder="Minutes" min="0" max="59" value={mins} onChange={e => setMins(e.target.value)} onBlur={normalizeDuration} />
            </div>
            <div className="flex-1">
              <input type="number" className="input" placeholder="Seconds" min="0" max="59" value={secs} onChange={e => setSecs(e.target.value)} onBlur={normalizeDuration} />
            </div>
          </div>
          {durationSeconds > 0 && (
            <p className="text-xs text-[#64748B] mt-1">
              {Math.floor(durationSeconds / 3600) > 0 ? `${Math.floor(durationSeconds / 3600)}h ` : ''}{Math.floor((durationSeconds % 3600) / 60) > 0 ? `${Math.floor((durationSeconds % 3600) / 60)}m ` : ''}{durationSeconds % 60 > 0 ? `${durationSeconds % 60}s` : ''}
            </p>
          )}
        </div>

        {/* Effort */}
        <div>
          <label className="label">Effort * <span className="text-[#64748B]">(1–11)</span></label>
          <div className="flex gap-1.5 flex-wrap">
            {[1,2,3,4,5,6,7,8,9,10,11].map(n => (
              <button
                key={n}
                onClick={() => setEffort(n)}
                className={`w-9 h-9 rounded-lg text-sm font-semibold border transition-all ${
                  effort === n
                    ? 'text-white border-2'
                    : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
                }`}
                style={effort === n ? { background: accentColor + 'cc', borderColor: accentColor } : {}}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Distance */}
        <div>
          <label className="label">Distance (optional)</label>
          <DistancePicker value={distance} onChange={setDistance} exerciseType={exerciseType} />
        </div>

        {/* More details toggle */}
        <DashedToggleButton
          label="More optional details"
          hideLabel="Hide optional details"
          expanded={showMore}
          onClick={() => setShowMore(v => !v)}
        />

        {showMore && (
          <div className="flex flex-col gap-3 rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
            {/* Pace */}
            <div>
              <label className="label">Average Pace <span className="text-[#64748B]">min/km</span></label>
              <div className="flex gap-2 items-center">
                <input type="number" className="input" placeholder="Min" min="0" value={paceMin} onChange={e => { paceManuallyEdited.current = true; setPaceMin(e.target.value); }} />
                <span className="text-[#64748B]">:</span>
                <input type="number" className="input" placeholder="Sec" min="0" max="59" value={paceSec} onChange={e => { paceManuallyEdited.current = true; setPaceSec(e.target.value); }} />
                {(paceMin || paceSec) && (
                  <button type="button" onClick={() => { paceManuallyEdited.current = false; setPaceMin(''); setPaceSec(''); }} className="text-xs text-[#64748B] hover:text-white px-2 py-1 rounded-lg border border-[#334155] hover:border-[#475569] flex-shrink-0">✕</button>
                )}
              </div>
              {autoPaceDecimal && !paceManuallyEdited.current && (
                <p className="text-xs text-[#475569] mt-1">Auto-calculated · tap to override, ✕ to reset</p>
              )}
            </div>

            <div>
              <label className="label">Max Pace <span className="text-[#64748B]">min/km</span></label>
              <div className="flex gap-2 items-center">
                <input type="number" className="input" placeholder="Min" min="0" value={maxPaceMin} onChange={e => setMaxPaceMin(e.target.value)} />
                <span className="text-[#64748B]">:</span>
                <input type="number" className="input" placeholder="Sec" min="0" max="59" value={maxPaceSec} onChange={e => setMaxPaceSec(e.target.value)} />
              </div>
            </div>

            {/* HR */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Avg Heart Rate</label>
                <ScrollFieldPicker
                  label="Avg Heart Rate" unit="bpm" min={28} max={230} value={avgHr} onChange={setAvgHr}
                  suggestion={suggestedAvgHr(age, effort)} preferSuggestion placeholder="bpm"
                />
                {avgHr && maxHrEstimate && (
                  (() => {
                    const z = hrZoneInfo(parseInt(avgHr), maxHrEstimate);
                    return (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: z.color + '22', color: z.color, border: `1px solid ${z.color}44` }}>Zone {z.zone}</span>
                        <span className="text-xs text-[#64748B]">{z.label}</span>
                      </div>
                    );
                  })()
                )}
                {!avgHr && effort && effortHrHint(effort, age) && (
                  (() => {
                    const hint = effortHrHint(effort, age)!;
                    return (
                      <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1.5 rounded-lg" style={{ background: hint.color + '11', border: `1px solid ${hint.color}33` }}>
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: hint.color + '22', color: hint.color, border: `1px solid ${hint.color}44` }}>Zone {hint.zone}</span>
                        <span className="text-xs" style={{ color: hint.color + 'cc' }}>Guess based on age + effort · {hint.low}–{hint.high} bpm</span>
                      </div>
                    );
                  })()
                )}
              </div>
              <div>
                <label className="label">Max Heart Rate</label>
                <ScrollFieldPicker
                  label="Max Heart Rate" unit="bpm" min={28} max={230} value={maxHr} onChange={setMaxHr}
                  suggestion={suggestedMaxHr(age, effort)} preferSuggestion placeholder="bpm"
                />
              </div>
            </div>

            {/* Intensity Minutes */}
            <div>
              <label className="label">Intensity Minutes</label>
              <input type="number" className="input" placeholder="e.g. 25" value={intensityMins} onChange={e => setIntensityMins(e.target.value)} />
            </div>

            {/* Elevation Gain */}
            <div>
              <label className="label">Elevation Gain <span className="text-[#64748B]">m</span></label>
              <ScrollFieldPicker label="Elevation Gain" unit="m" max={9000} value={elevationGain} onChange={setElevationGain} suggestion={0} placeholder="e.g. 120" />
            </div>
          </div>
        )}

          </div>{/* end RIGHT col */}
        </div>{/* end TOP ROW */}

        {/* ── DIVIDER 1 ── */}
        <div className="hidden md:block border-t border-[#334155]" />

        {/* ── MIDDLE ROW: 2-col on desktop ── */}
        <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-x-8 md:items-start">

          {/* LEFT: Surroundings */}
          <div className="flex flex-col gap-4">

        {/* Surroundings toggle */}
        <DashedToggleButton
          label="Surroundings"
          hideLabel="Hide surroundings"
          expanded={showSurroundings}
          onClick={() => setShowSurroundings(v => !v)}
        />
        {showSurroundings && (
          <div className="flex flex-col gap-3 rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
            <TagToggleGrid
              label="Select all that apply"
              groups={[
                (Object.keys(COMPANION_LABELS) as Companion[]).map(key => ({
                  key, label: COMPANION_LABELS[key], emoji: COMPANION_EMOJI[key], doodle: COMPANION_ICON_OVERRIDES[key],
                  active: companions.includes(key), onToggle: () => toggleCompanion(key),
                })),
                (Object.keys(CONDITION_LABELS) as WeatherCondition[]).map(key => ({
                  key, label: CONDITION_LABELS[key], emoji: CONDITION_EMOJI[key], doodle: CONDITION_ICON_OVERRIDES[key],
                  active: conditions.includes(key), onToggle: () => toggleCondition(key),
                })),
              ]}
            />
          </div>
        )}

          </div>{/* end LEFT col (Surroundings) */}

          {/* RIGHT: Notes + Feelings */}
          <div className="flex flex-col gap-4">

        {/* Notes */}
        <div>
          <label className="label">Notes / Highlights (optional)</label>
          <textarea
            className="input"
            placeholder="How did it go? Any highlights?"
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ resize: 'vertical' }}
          />
          {notes.length > 0 && <p className="text-xs text-[#475569] mt-1 text-right">{notes.length} characters</p>}
          {/* Quick note chips */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {['Felt strong 💪', 'Tired legs 🥱', 'Good pacing ⏱', 'Hard effort 😤', 'Easy recovery 😌', 'Sore 😬', 'In the zone 🎯', 'Tough conditions 🌧'].map(chip => (
              <button
                key={chip}
                type="button"
                onClick={() => setNotes(n => n ? `${n} ${chip}` : chip)}
                className="text-xs px-2 py-0.5 rounded-full border border-[#334155] text-[#64748B] hover:border-[#475569] hover:text-[#94A3B8] transition-all"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Feeling after + session vibes */}
        <div className="flex flex-col gap-3 rounded-xl border border-[#334155] bg-[#1E293B]/50 p-4">
          <div>
            <label className="label mb-2">How did you feel after? <span className="text-[#64748B]">(optional)</span></label>
            <div className="flex flex-wrap gap-1">
              {([-1,0,1,2,3,4,5,6,7,8,9,10] as const).map(n => {
                const emoji = ({'-1':'🤮','0':'😭','1':'😞','2':'🥵','3':'🥱','4':'🫠','5':'😐','6':'😌','7':'🙂','8':'😊','9':'😄','10':'🤩'} as Record<string, string>)[String(n)];
                const active = feelingAfter === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setFeelingAfter(active ? null : n)}
                    title={String(n)}
                    className={`w-9 h-9 rounded-lg text-base transition-all border ${active ? 'border-blue-500 bg-blue-500/20' : 'border-transparent hover:border-[#334155]'}`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="label mb-2">Session vibes <span className="text-[#64748B]">(optional, multi-select)</span></label>
            <div className="flex flex-wrap gap-1">
              {['💧','😆','🧘','💪','🤙','👍','👎','👌','⚡','🔥','🎯','😅','🏆','💨','😤','🦾','🌟','🤸','💯','🎉'].map(emoji => {
                const active = workoutVibes.includes(emoji);
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setWorkoutVibes(active ? workoutVibes.filter(e => e !== emoji) : [...workoutVibes, emoji])}
                    className={`w-9 h-9 rounded-lg text-base transition-all border ${active ? 'border-blue-500 bg-blue-500/20' : 'border-transparent hover:border-[#334155]'}`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

          </div>{/* end RIGHT col (Notes + Feelings) */}
        </div>{/* end MIDDLE ROW */}

        {/* ── DIVIDER 2 ── */}
        <div className="hidden md:block border-t border-[#334155]" />

        {/* ── BOTTOM: Photos + PB centred ── */}
        <div className="flex flex-col gap-4 md:max-w-lg md:mx-auto md:w-full">

        {/* Photos */}
        {user && (
          <ImageUploader
            userId={user.id}
            value={images}
            thumbValue={imageThumbs}
            onChange={(urls, thumbs) => { setImages(urls); setImageThumbs(thumbs); }}
          />
        )}

        {/* PB */}
        <div>
          <button
            onClick={() => setIsPb(!isPb)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all w-full ${
              isPb
                ? 'border-yellow-500 bg-yellow-500/10 text-yellow-300'
                : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
            }`}
          >
            <span className="text-xl">⭐</span>
            {isPb ? 'Personal Best! 🎉' : 'Mark as Personal Best'}
          </button>
          {isPb && (
            <div className="mt-2">
              <input
                className="input"
                placeholder="What type of PB? (e.g. Fastest 5km, Longest run)"
                value={pbDesc}
                onChange={e => setPbDesc(e.target.value)}
              />
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-sm">
            {error}
          </div>
        )}

        </div>{/* end BOTTOM */}
      </div>

      {/* Sticky save + progress bar — all screen sizes */}
      <div className="fixed bottom-14 md:bottom-0 left-0 md:left-56 right-0 z-40 bg-[#0F172A]/95 backdrop-blur-sm border-t border-[#334155]">
        {progressCount > 0 && (
          <div className="md:max-w-4xl md:mx-auto">
            <div className="h-1 w-full bg-[#1E293B]">
              <div className="h-full transition-all duration-300" style={{ width: `${(progressCount / 6) * 100}%`, background: accentColor }} />
            </div>
          </div>
        )}
        <div className="p-3 md:max-w-4xl md:mx-auto">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full py-3 text-base"
          style={{ background: accentColor }}
        >
          {saving ? 'Saving...' : 'Save Exercise'}
        </button>
        </div>
      </div>

      {/* Repeat a recent activity */}
      {showRepeatPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={() => setShowRepeatPicker(false)}>
          <div className="card w-full sm:w-96 max-h-[75vh] overflow-y-auto rounded-b-none sm:rounded-b-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white">Repeat a Recent Activity</span>
              <button onClick={() => setShowRepeatPicker(false)} className="p-1 rounded-lg hover:bg-[#334155] text-[#94A3B8]">✕</button>
            </div>
            {loadingRecent && <p className="text-xs text-[#64748B]">Loading...</p>}
            {!loadingRecent && recentActivities?.length === 0 && (
              <p className="text-xs text-[#64748B]">No activities logged in the last 30 days.</p>
            )}
            <div className="flex flex-col gap-2">
              {recentActivities?.map(a => (
                <button
                  key={a.id}
                  onClick={() => applyRecentActivity(a)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#334155] hover:border-[#475569] text-left"
                >
                  <ColorDot color={a.exercise_type === 'run' && a.run_type ? RUN_TYPE_COLORS[a.run_type] : EXERCISE_TYPE_COLORS[a.exercise_type]} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-white truncate">{a.name}</span>
                    <span className="block text-xs text-[#64748B]">
                      {a.date.split('-').reverse().join('/')} · {formatDuration(a.duration_minutes)}
                      {a.distance_km ? ` · ${formatDistance(a.distance_km, a.exercise_type)}` : ''}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Duplicate detection modal */}
      {duplicateCheck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDuplicateCheck(null)}>
          <div className="card w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-white mb-1">Already logged today?</h3>
            <p className="text-xs text-[#64748B] mb-4">You&apos;ve already logged a <span className="text-white font-medium">{EXERCISE_TYPE_LABELS[duplicateCheck.existing.exercise_type as ExerciseType]}</span> session today:</p>
            <div className="rounded-lg border border-[#334155] bg-[#0F172A] p-3 mb-4 text-sm">
              <p className="font-medium text-white">{duplicateCheck.existing.name}</p>
              {duplicateCheck.existing.duration_seconds != null && (
                <p className="text-xs text-[#64748B] mt-0.5">
                  {Math.floor((duplicateCheck.existing.duration_seconds ?? 0) / 3600) > 0 && `${Math.floor((duplicateCheck.existing.duration_seconds ?? 0) / 3600)}h `}
                  {Math.floor(((duplicateCheck.existing.duration_seconds ?? 0) % 3600) / 60)}min
                  {duplicateCheck.existing.effort ? ` · Effort ${duplicateCheck.existing.effort}` : ''}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { duplicateCheck.onConfirm(); setDuplicateCheck(null); }}
                className="btn-primary py-2.5 text-sm"
                style={{ background: accentColor }}
              >
                Still save — this is a different session
              </button>
              <button
                onClick={() => {
                  setDuplicateCheck(null);
                  router.push(`/log?edit=${duplicateCheck.existing.id}`);
                }}
                className="py-2.5 text-sm rounded-lg border border-[#334155] text-[#94A3B8] hover:border-[#475569] hover:text-white transition-all"
              >
                Oops, duplicate — edit the existing one
              </button>
              <button
                onClick={() => setDuplicateCheck(null)}
                className="text-xs text-[#475569] hover:text-white py-1 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved changes modal */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6 max-w-sm w-full">
            <h2 className="text-white font-bold text-lg mb-2">Unsaved changes</h2>
            <p className="text-[#94A3B8] text-sm mb-5">You have unsaved changes on this form. Leave anyway?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowWarning(false)} className="btn-secondary flex-1">
                Keep editing
              </button>
              <button
                className="btn-primary flex-1"
                onClick={() => {
                  setShowWarning(false);
                  setDirty(false);
                  router.push(pendingHref);
                }}
              >
                Leave anyway
              </button>
            </div>
          </div>
        </div>
      )}
      {pbCelebration && (
        <PbCelebrationModal reasons={pbCelebration} onClose={() => setPbCelebration(null)} onNavigate={navigateFromModal} />
      )}
      {savedTitle && (
        <ActivitySavedModal title={savedTitle} onClose={() => setSavedTitle(null)} onNavigate={navigateFromModal} />
      )}
      {duplicatePrompt && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70" onClick={() => setDuplicatePrompt(null)}>
          <div className="w-full max-w-sm bg-[#1E293B] border border-yellow-500/40 rounded-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="text-3xl mb-3 text-center">⚠️</div>
            <h2 className="text-white font-bold text-lg text-center mb-1">Possible duplicate?</h2>
            <p className="text-[#94A3B8] text-sm text-center mb-4">
              You already have a <span className="text-white font-medium">{EXERCISE_TYPE_LABELS[duplicatePrompt.existing.exercise_type as keyof typeof EXERCISE_TYPE_LABELS] ?? duplicatePrompt.existing.exercise_type}</span> logged today:
            </p>
            <div className="bg-[#0F172A] rounded-xl p-3 mb-5 text-sm">
              <p className="text-white font-medium">{duplicatePrompt.existing.name}</p>
              <p className="text-[#94A3B8] text-xs mt-0.5">
                {formatDuration(duplicatePrompt.existing.duration_minutes)}
                {duplicatePrompt.existing.distance_km ? ` · ${formatDistance(duplicatePrompt.existing.distance_km, 'run')}` : ''}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => setDuplicatePrompt(null)} className="btn-primary w-full">Keep both — different session</button>
              <button onClick={() => dismissDuplicate(duplicatePrompt.newId)} className="btn-secondary w-full text-red-400">Oops — delete the new one</button>
              <button onClick={() => dismissDuplicate(duplicatePrompt.existing.id)} className="btn-secondary w-full text-red-400">Oops — delete the old one</button>
            </div>
          </div>
        </div>
      )}
      {planMatchPrompt && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70" onClick={() => setPlanMatchPrompt(null)}>
          <div className="w-full max-w-sm bg-[#1E293B] border border-blue-500/40 rounded-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="text-3xl mb-3 text-center">📋</div>
            <h2 className="text-white font-bold text-lg text-center mb-1">Apply to your plan?</h2>
            <p className="text-[#94A3B8] text-sm text-center mb-5">
              This matches your planned <span className="text-white font-medium">{planMatchPrompt.sessionTitle}</span> session. Count it as done?
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={applyPlanMatch} className="btn-primary w-full">Yes, apply to plan ✓</button>
              <button onClick={() => setPlanMatchPrompt(null)} className="btn-secondary w-full">No, skip</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
