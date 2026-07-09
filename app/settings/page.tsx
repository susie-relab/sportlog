'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [streakReminder, setStreakReminder] = useState(true);
  const [reminderHour, setReminderHour] = useState(17);
  const [weekStartDay, setWeekStartDay] = useState<'monday' | 'sunday'>('monday');
  const [lightTheme, setLightTheme] = useState(false);

  const flash = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  const savePrefs = async (patch: Record<string, unknown>) => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { ...user?.user_metadata, ...patch } });
    setSaving(false);
    flash(error ? error.message : 'Preferences saved!', !error);
  };

  useEffect(() => {
    if (user?.user_metadata?.streak_reminder !== undefined) setStreakReminder(user.user_metadata.streak_reminder);
    if (user?.user_metadata?.streak_reminder_hour !== undefined) setReminderHour(user.user_metadata.streak_reminder_hour);
    if (user?.user_metadata?.week_start_day === 'sunday') setWeekStartDay('sunday');
    setLightTheme(user?.user_metadata?.theme === 'light');
  }, [user]);

  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-1">Settings</h1>
      <p className="text-sm text-[#64748B] mb-5">{user?.email}</p>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg border text-sm ${msg.ok ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-red-900/40 border-red-700 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      {/* Data */}
      <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">Data</p>
      <Link href="/import" className="flex items-center justify-between card hover:border-[#475569] transition-colors mb-6">
        <div>
          <h2 className="text-sm font-semibold text-white">Import data</h2>
          <p className="text-xs text-[#64748B] mt-0.5">Bring in activities from a file (e.g. Garmin export).</p>
        </div>
        <span className="text-[#64748B]">›</span>
      </Link>

      {/* Connections */}
      <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">Connections</p>
      <div className="card mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2"><span>🔗</span> Strava</h2>
            <p className="text-xs text-[#64748B] mt-1">Auto-sync your Garmin &amp; other activities via Strava.</p>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B] border border-[#334155] rounded-full px-2 py-1 flex-shrink-0">Coming soon</span>
        </div>
      </div>

      {/* Preferences */}
      <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">Preferences</p>
      <div className="card mb-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white">Evening streak reminder</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Nudge me to log if my streak is at risk.</p>
          </div>
          <button
            onClick={() => { const v = !streakReminder; setStreakReminder(v); savePrefs({ streak_reminder: v, streak_reminder_hour: reminderHour }); }}
            role="switch" aria-checked={streakReminder}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${streakReminder ? 'bg-blue-600' : 'bg-[#334155]'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${streakReminder ? 'translate-x-5' : ''}`} />
          </button>
        </div>
        {streakReminder && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-[#94A3B8]">Remind me after</span>
            <select className="input w-auto text-sm" value={reminderHour} onChange={e => { const h = parseInt(e.target.value); setReminderHour(h); savePrefs({ streak_reminder: streakReminder, streak_reminder_hour: h }); }}>
              {[15, 16, 17, 18, 19, 20, 21].map(h => <option key={h} value={h}>{h > 12 ? `${h - 12}pm` : `${h}am`}</option>)}
            </select>
          </div>
        )}

        <div className="border-t border-[#334155] pt-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-white font-semibold">Week start day</p>
            <p className="text-xs text-[#64748B]">Used for weekly goals, streaks, and &quot;this week&quot; stats.</p>
          </div>
          <select
            className="input w-auto text-sm"
            value={weekStartDay}
            onChange={e => { const v = e.target.value as 'monday' | 'sunday'; setWeekStartDay(v); savePrefs({ week_start_day: v }); }}
          >
            <option value="monday">Monday</option>
            <option value="sunday">Sunday</option>
          </select>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-white font-semibold">Light theme</p>
            <p className="text-xs text-[#64748B]">Switch the app to a light appearance.</p>
          </div>
          <button
            onClick={() => { const v = !lightTheme; setLightTheme(v); savePrefs({ theme: v ? 'light' : 'dark' }); }}
            role="switch" aria-checked={lightTheme}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${lightTheme ? 'bg-blue-600' : 'bg-[#334155]'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${lightTheme ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sign out */}
      <button onClick={signOut} className="w-full py-3 rounded-lg border border-red-800/50 text-red-400 text-sm font-medium hover:bg-red-900/20 transition-colors">
        Sign Out
      </button>
    </div>
  );
}
