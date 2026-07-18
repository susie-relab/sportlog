'use client';
import { useState, useEffect, useCallback } from 'react';
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
import { sessionParts, combineSessions, WEEKDAYS, isRunSession } from '@/lib/runPlanGenerator';
import ConfettiBurst from '@/components/ConfettiBurst';
import PbCelebrationModal from '@/components/PbCelebrationModal';
import ActivitySavedModal, { randomEncouragement } from '@/components/ActivitySavedModal';
import AccountSwitcher from '@/components/AccountSwitcher';
import { detectAutoPBs } from '@/lib/pbDetect';
import { todayLocalISO, openDatePicker, calcAge, formatDuration, formatDistance } from '@/lib/utils';

function ColorDot({ color }: { color: string }) {
  return <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ background: color }} />;
}

/** Sub-type button with an icon (reused from the "This Year" tile set) and no visible box
 *  until selected — keeps a dense grid from looking like a wall of identical outlined boxes. */
function IconSubtypeButton({ label, subtypeKey, active, onClick, activeClass }: {
  label: string; subtypeKey: string; active: boolean; onClick: () => void; activeClass: string;
}) {
  const Icon = SUBTYPE_ICON_OVERRIDES[subtypeKey] as LucideIcon | undefined;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium border transition-all text-left ${
        active ? activeClass : 'border-transparent text-[#94A3B8] hover:text-white'
      }`}
    >
      {Icon && <Icon size={15} className="flex-shrink-0" />}
      <span className="truncate">{label}</span>
    </button>
  );
}

/** Style option shown as a plain bullet list (no box) — for groups where a full button grid
 *  reads as too heavy; the bullet fills in solid when selected. */
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
  const [showRepeatPicker, setShowRepeatPicker] = useState(false);
  const [recentActivities, setRecentActivities] = useState<Activity[] | null>(null);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // Prefill from query params (e.g. clicking a session in a training plan)
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

  const durationSeconds = (parseInt(hours || '0') * 3600) + (parseInt(mins || '0') * 60) + parseInt(secs || '0');
  // Whole minutes + a leftover-seconds remainder are both stored — floor (not round) the
  // minutes so entering seconds never bumps the saved minutes up (45:30 stays 45m 30s, not 46m).
  const durationMinutes = Math.floor(durationSeconds / 60);
  const durationExtraSeconds = durationSeconds % 60;

  // Rolls an overflowing minutes/seconds field up into the unit above it (e.g. typing "70"
  // minutes becomes 1h 10m) as soon as the user taps out of any of the three duration fields.
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

  // Prefills the form from a past activity so the user can tweak it before saving — deliberately
  // leaves notes, photos, the PB flag, and the date alone, since those belong to that past
  // session specifically, not to today's repeat of it.
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
    if (a.sport_focus || a.sport_style || a.swim_focus || a.swim_styles || a.snow_styles || a.water_styles) setShowMore(true);
    if (a.pace_min_km != null || a.max_pace_min_km != null || a.max_hr != null || a.avg_hr != null || a.intensity_minutes != null || a.elevation_gain_m != null) setShowMore(true);
    setShowRepeatPicker(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return setError('Please enter an activity name.');
    if (!exerciseType) return setError('Please select an exercise type.');
    if (durationSeconds <= 0) return setError('Please enter a valid duration.');
    if (!effort) return setError('Please select effort level.');

    setSaving(true);
    setError('');

    // Swim distance is entered/shown in metres — convert to km for storage/pace math,
    // since distance_km (and pace_min_km) are shared across every exercise type.
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
      date,
    }).select('id').single();

    // Check for an auto-detected PB (fastest distance, longest session, best pace — both for
    // the overall exercise type and for each subtype) against prior activity, and/or the
    // user's manual "Personal Best" flag. Narrowed to rows that could actually match a
    // category: same exercise type (covers type- and subtype-level comparisons), or any row
    // with a distance (needed for the cross-type "fastest at this race distance" check) —
    // this avoids pulling the user's entire multi-year history on every save.
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
      // Only auto-star if the user hadn't already manually starred it — a manual star always wins.
      if (!isPb && autoReasons.length > 0) {
        await supabase.from('activities').update({ is_pb: true, pb_auto: true, pb_description: autoReasons.join(' · ') }).eq('id', inserted.id);
      }
    }
    const pbReasons = isPb && pbDesc.trim() ? [pbDesc.trim(), ...autoReasons] : autoReasons;

    // If this came from a training plan session, mark that day complete.
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

          // Was that the plan's final remaining session? Surface a completion celebration.
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

    setSaving(false);

    if (dbErr) {
      setError(dbErr.message);
    } else {
      setConfettiColor(accentColor);
      setTimeout(() => setConfettiColor(null), 2200);
      if (isPb || pbReasons.length > 0) setPbCelebration(pbReasons);
      else setSavedTitle(randomEncouragement());
      // Reset form
      setName(''); setExerciseType(''); setRunType(''); setRunTypeModifier(''); setSubType(''); setGymTypes([]); setWalkTypes([]); setSportFocus(''); setSportStyle(''); setSwimFocus(''); setSwimStyles([]); setSnowStyles([]); setWaterStyles([]); setCompanions([]); setConditions([]); setHours(''); setMins(''); setSecs('');
      setEffort(null); setDistance(''); setNotes(''); setIntensityMins('');
      setPaceMin(''); setPaceSec(''); setMaxPaceMin(''); setMaxPaceSec('');
      setMaxHr(''); setAvgHr(''); setElevationGain(''); setIsPb(false); setPbDesc('');
      setImages([]); setImageThumbs([]);
      setDate(todayLocalISO());
      setShowMore(false);
      // form is clean after save

      // Give the confetti/PB-celebration a moment to play before navigating away.
      if (planCompleted) {
        setTimeout(() => router.push(`/training-plan?plan=${planCompleted.planId}&celebrate=1`), 1800);
      } else if (fromDash) {
        setTimeout(() => router.push('/dash'), 1800);
      }
    }
  };

  const accentColor = exerciseType === 'run' && runType
    ? RUN_TYPE_COLORS[runType]
    : exerciseType
    ? EXERCISE_TYPE_COLORS[exerciseType]
    : '#3B82F6';

  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto relative">
      <div className="absolute top-0 right-0 z-10">
        <AccountSwitcher compact />
      </div>
      <div className="flex items-center justify-between mb-5 gap-2 flex-wrap pr-16 sm:pr-0">
        <h1 className="text-xl font-bold text-white">Add Exercise</h1>
        <button type="button" onClick={openRepeatPicker} className="text-sm text-blue-400 hover:text-blue-300">
          ↻ Repeat a recent activity
        </button>
      </div>

      {confettiColor && <ConfettiBurst color={confettiColor} />}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Name */}
        <div>
          <label className="label">Activity Name *</label>
          <input className="input" placeholder="e.g. Morning Run" value={name} onChange={e => setName(e.target.value)} />
        </div>

        {/* Date */}
        <div>
          <label className="label">Date *</label>
          <input type="date" className="input" value={date} onClick={openDatePicker} onChange={e => setDate(e.target.value)} />
        </div>

        {/* Exercise Type */}
        <div>
          <label className="label">Exercise Session *</label>
          <div className="grid grid-cols-2 gap-2">
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

        {/* Run Type and Run Style are independent; pick at most one of each */}
        {exerciseType === 'run' && (
          <div>
            <label className="label">Run Type <span className="text-[#64748B]">(optional)</span></label>
            <div className="grid grid-cols-2 gap-1">
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
            <label className="label mt-3">Run Style <span className="text-[#64748B]">(optional)</span></label>
            <div className="grid grid-cols-2 gap-2">
              {RUN_TYPE_TERRAIN.map(type => {
                const RunStyleIcon = RUN_STYLE_ICON_OVERRIDES[type];
                return (
                <button
                  key={type}
                  onClick={() => setRunTypeModifier(runTypeModifier === type ? '' : type)}
                  className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium border transition-all text-left ${
                    runTypeModifier === type
                      ? 'border-2 text-white'
                      : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'
                  }`}
                  style={runTypeModifier === type ? {
                    borderColor: RUN_TYPE_COLORS[type],
                    background: RUN_TYPE_COLORS[type] + '33',
                  } : {}}
                >
                  {RunStyleIcon && <RunStyleIcon size={16} className="flex-shrink-0 mr-2" style={{ color: RUN_TYPE_COLORS[type] }} />}
                  {RUN_TYPE_LABELS[type]}
                </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sport subtype */}
        {exerciseType === 'sport' && (
          <div>
            <label className="label">Sport Type <span className="text-[#64748B]">(optional)</span></label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(SPORT_SUB_LABELS) as SportSubType[]).map(t => (
                <IconSubtypeButton key={t} label={SPORT_SUB_LABELS[t]} subtypeKey={t} active={subType === t}
                  onClick={() => setSubType(subType === t ? '' : t)} activeClass="border-orange-500 bg-orange-500/20 text-white" />
              ))}
            </div>
            <label className="label mt-3">Sport Focus <span className="text-[#64748B]">(optional)</span></label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(SPORT_FOCUS_LABELS) as SportFocus[]).map(t => (
                <button key={t} onClick={() => setSportFocus(sportFocus === t ? '' : t)}
                  className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all text-center ${sportFocus === t ? 'border-orange-500 bg-orange-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}>
                  {SPORT_FOCUS_LABELS[t]}
                </button>
              ))}
            </div>
            <label className="label mt-3">Sport Style <span className="text-[#64748B]">(optional)</span></label>
            <div className="grid grid-cols-2 gap-1">
              {(Object.keys(SPORT_STYLE_LABELS) as SportStyle[]).map(t => (
                <BulletStyleOption key={t} label={SPORT_STYLE_LABELS[t]} active={sportStyle === t}
                  onClick={() => setSportStyle(sportStyle === t ? '' : t)} color={SPORT_STYLE_COLORS[t]} />
              ))}
            </div>
          </div>
        )}
        {/* Gym subtype — multi select */}
        {exerciseType === 'hiit' && (
          <div>
            <label className="label">Workout Focus <span className="text-[#64748B]">(optional + multi-select)</span></label>
            <div className="grid grid-cols-2 gap-1.5">
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
        {exerciseType === 'water' && (
          <div>
            <label className="label">Activity <span className="text-[#64748B]">(optional)</span></label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(WATER_SUB_LABELS) as WaterSubType[]).map(t => (
                <IconSubtypeButton key={t} label={WATER_SUB_LABELS[t]} subtypeKey={t} active={subType === t}
                  onClick={() => setSubType(subType === t ? '' : t)} activeClass="border-sky-500 bg-sky-500/20 text-white" />
              ))}
            </div>
            <label className="label mt-3">Water Style <span className="text-[#64748B]">(optional + multi-select)</span></label>
            <div className="grid grid-cols-2 gap-1.5">
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
          </div>
        )}
        {exerciseType === 'snow' && (
          <div>
            <label className="label">Activity <span className="text-[#64748B]">(optional)</span></label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(SNOW_SUB_LABELS) as SnowSubType[]).map(t => (
                <IconSubtypeButton key={t} label={SNOW_SUB_LABELS[t]} subtypeKey={t} active={subType === t}
                  onClick={() => setSubType(subType === t ? '' : t)} activeClass="border-sky-500 bg-sky-500/20 text-white" />
              ))}
            </div>
            <label className="label mt-3">Snow Style <span className="text-[#64748B]">(optional + multi-select)</span></label>
            <div className="grid grid-cols-2 gap-1.5">
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
          </div>
        )}
        {exerciseType === 'swim' && (
          <div>
            <label className="label">Swim Type <span className="text-[#64748B]">(optional)</span></label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(SWIM_SUB_LABELS) as SwimSubType[]).map(t => (
                <IconSubtypeButton key={t} label={SWIM_SUB_LABELS[t]} subtypeKey={t} active={subType === t}
                  onClick={() => setSubType(subType === t ? '' : t)} activeClass="border-cyan-500 bg-cyan-500/20 text-white" />
              ))}
            </div>
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
          </div>
        )}
        {exerciseType === 'solo_fitness' && (
          <div>
            <label className="label">Activity Type <span className="text-[#64748B]">(optional)</span></label>
            <div className="grid grid-cols-2 gap-1.5">
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
            <div className="grid grid-cols-3 gap-1.5">
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

        {/* Duration */}
        <div>
          <label className="label">Duration *</label>
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="number"
                className="input"
                placeholder="Hours"
                min="0"
                value={hours}
                onChange={e => setHours(e.target.value)}
                onBlur={normalizeDuration}
              />
            </div>
            <div className="flex-1">
              <input
                type="number"
                className="input"
                placeholder="Minutes"
                min="0"
                max="59"
                value={mins}
                onChange={e => setMins(e.target.value)}
                onBlur={normalizeDuration}
              />
            </div>
            <div className="flex-1">
              <input
                type="number"
                className="input"
                placeholder="Seconds"
                min="0"
                max="59"
                value={secs}
                onChange={e => setSecs(e.target.value)}
                onBlur={normalizeDuration}
              />
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

        {/* Distance — always visible */}
        <div>
          <label className="label">Distance (optional)</label>
          <DistancePicker value={distance} onChange={setDistance} exerciseType={exerciseType} />
        </div>

        {/* More details toggle */}
        <button
          type="button"
          onClick={() => setShowMore(v => !v)}
          className="flex items-center gap-2 text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors py-1"
        >
          <span>{showMore ? '▼' : '▶'}</span>
          {showMore ? 'Hide optional details' : 'More optional details'}
        </button>

        {showMore && (
          <>
            {/* Pace */}
            <div>
              <label className="label">Average Pace <span className="text-[#64748B]">min/km</span></label>
              <div className="flex gap-2 items-center">
                <input type="number" className="input" placeholder="Min" min="0" value={paceMin} onChange={e => setPaceMin(e.target.value)} />
                <span className="text-[#64748B]">:</span>
                <input type="number" className="input" placeholder="Sec" min="0" max="59" value={paceSec} onChange={e => setPaceSec(e.target.value)} />
              </div>
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
                  suggestion={suggestedAvgHr(user?.user_metadata?.birthday ? calcAge(user.user_metadata.birthday) : null, effort)} preferSuggestion placeholder="bpm"
                />
              </div>
              <div>
                <label className="label">Max Heart Rate</label>
                <ScrollFieldPicker
                  label="Max Heart Rate" unit="bpm" min={28} max={230} value={maxHr} onChange={setMaxHr}
                  suggestion={suggestedMaxHr(user?.user_metadata?.birthday ? calcAge(user.user_metadata.birthday) : null, effort)} preferSuggestion placeholder="bpm"
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

            {/* Companions & conditions — universal tags, shown regardless of exercise type.
                Two groups (not one flat list) so companions always keep their own top row,
                never sharing it with conditions regardless of the column count at this width. */}
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
          </>
        )}

        {/* Notes — always visible */}
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
        </div>

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

        {/* Repeats the top error banner here — validation failures are often for a field
            above this point, and the user is usually scrolled down to this button when
            Save fails, so the top banner alone can go unnoticed. */}
        {error && (
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full mt-2 py-3 text-base"
          style={{ background: accentColor }}
        >
          {saving ? 'Saving...' : 'Save Exercise'}
        </button>
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
        <PbCelebrationModal reasons={pbCelebration} onClose={() => setPbCelebration(null)} />
      )}
      {savedTitle && (
        <ActivitySavedModal title={savedTitle} onClose={() => setSavedTitle(null)} />
      )}
    </div>
  );
}
