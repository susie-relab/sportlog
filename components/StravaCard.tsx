'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import { formatDate, formatDuration, formatPaceMinKm } from '@/lib/utils';
import { EXERCISE_TYPE_LABELS } from '@/types';

interface StravaConnection {
  user_id: string;
  strava_athlete_id: number;
  last_synced_at: string | null;
}

interface PendingDuplicate {
  id: string;
  strava_activity_id: number;
  strava_data: {
    name: string; exercise_type: string; date: string;
    distance_km: number | null; duration_minutes: number; pace_min_km: number | null;
    run_type: string | null; sub_type: string | null; duration_seconds: number;
    max_hr: number | null; avg_hr: number | null; elevation_gain_m: number | null;
  };
  matched_activity_id: string | null;
  status: string;
}

export default function StravaCard() {
  const { user } = useAuth();
  const [connection, setConnection] = useState<StravaConnection | null>(null);
  const [duplicates, setDuplicates] = useState<PendingDuplicate[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const [{ data: conn }, { data: dupes }] = await Promise.all([
      supabase.from('strava_connections').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('strava_pending_duplicates').select('*').eq('user_id', user.id).eq('status', 'pending'),
    ]);
    setConnection(conn as StravaConnection | null);
    setDuplicates((dupes as PendingDuplicate[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('strava');
    if (status === 'connected') setMsg('Strava connected! Importing your activities…');
    else if (status === 'denied') setMsg('Strava connection was cancelled.');
    else if (status === 'error') setMsg('Something went wrong connecting to Strava.');
    if (status) {
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => load(), status === 'connected' ? 3000 : 0);
    }
  }, []);

  const connect = async () => {
    setConnecting(true);
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    const res = await fetch('/api/strava/connect', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setConnecting(false);
    if (data.url) window.location.href = data.url;
    else setMsg(data.error || 'Could not start Strava connection.');
  };

  const disconnect = async () => {
    if (!user) return;
    await supabase.from('strava_connections').delete().eq('user_id', user.id);
    setConnection(null);
    setMsg('Strava disconnected.');
  };

  const syncNow = async () => {
    setSyncing(true);
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    const res = await fetch('/api/strava/sync', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setSyncing(false);
    setMsg(data.error || `Synced — ${data.imported} imported, ${data.flagged} flagged for review.`);
    load();
  };

  const resolveDuplicate = async (dupe: PendingDuplicate, action: 'save' | 'skip' | 'replace') => {
    if (!user) return;
    const fields = { ...dupe.strava_data };
    if (action === 'save') {
      await supabase.from('activities').insert({ ...fields, user_id: user.id, strava_activity_id: dupe.strava_activity_id, is_pb: false });
      await supabase.from('strava_pending_duplicates').update({ status: 'saved' }).eq('id', dupe.id);
    } else if (action === 'replace' && dupe.matched_activity_id) {
      await supabase.from('activities').update({ ...fields, strava_activity_id: dupe.strava_activity_id }).eq('id', dupe.matched_activity_id);
      await supabase.from('strava_pending_duplicates').update({ status: 'replaced' }).eq('id', dupe.id);
    } else {
      await supabase.from('strava_pending_duplicates').update({ status: 'skipped' }).eq('id', dupe.id);
    }
    setDuplicates(prev => prev.filter(d => d.id !== dupe.id));
  };

  if (loading) return null;

  return (
    <div className="card mb-6">
      <h2 className="text-sm font-semibold text-white mb-3">🟠 Strava</h2>
      {msg && <p className="text-xs text-[#94A3B8] mb-3">{msg}</p>}

      {!connection ? (
        <>
          <p className="text-xs text-[#64748B] mb-3">Connect Strava to automatically import your activities — no more double-logging.</p>
          <button onClick={connect} disabled={connecting} className="btn-primary w-full disabled:opacity-60">
            {connecting ? 'Connecting…' : 'Connect Strava'}
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-[#64748B] mb-3">
            Connected · Athlete #{connection.strava_athlete_id}
            {connection.last_synced_at && <> · Last synced {formatDate(connection.last_synced_at.slice(0, 10))}</>}
          </p>
          <div className="flex gap-2">
            <button onClick={syncNow} disabled={syncing} className="btn-primary flex-1 disabled:opacity-60">{syncing ? 'Syncing…' : 'Sync now'}</button>
            <button onClick={disconnect} className="btn-secondary flex-1">Disconnect</button>
          </div>
        </>
      )}

      {duplicates.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#334155]">
          <p className="text-xs font-semibold text-amber-400 mb-3">
            {duplicates.length} activit{duplicates.length === 1 ? 'y' : 'ies'} synced from Strava flagged as potential duplicate{duplicates.length === 1 ? '' : 's'} — check each:
          </p>
          <div className="flex flex-col gap-3">
            {duplicates.map(d => (
              <div key={d.id} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="text-sm font-semibold text-white">{d.strava_data.name}</div>
                <div className="text-xs text-[#94A3B8] mt-1">
                  {EXERCISE_TYPE_LABELS[d.strava_data.exercise_type as keyof typeof EXERCISE_TYPE_LABELS] ?? d.strava_data.exercise_type} · {formatDate(d.strava_data.date)}
                  {d.strava_data.distance_km ? ` · ${d.strava_data.distance_km} km` : ''}
                  {' · '}{formatDuration(d.strava_data.duration_minutes, d.strava_data.duration_seconds)}
                  {d.strava_data.pace_min_km ? ` · ${formatPaceMinKm(d.strava_data.pace_min_km)}` : ''}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <button onClick={() => resolveDuplicate(d, 'save')} className="py-1.5 rounded-lg border border-[#334155] text-[#94A3B8] text-xs hover:border-[#475569]">Save<br /><span className="text-[10px] text-[#64748B]">(as additional)</span></button>
                  <button onClick={() => resolveDuplicate(d, 'skip')} className="py-1.5 rounded-lg border border-[#334155] text-[#94A3B8] text-xs hover:border-[#475569]">Don&apos;t save</button>
                  <button onClick={() => resolveDuplicate(d, 'replace')} disabled={!d.matched_activity_id} className="py-1.5 rounded-lg border border-[#334155] text-[#94A3B8] text-xs hover:border-[#475569] disabled:opacity-40">Replace</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
