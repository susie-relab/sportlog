import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { EXERCISE_TYPE_LABELS, subTypeLabel, combinedRunTypeLabel } from '@/types';

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });

  const { activities } = await req.json();

  if (!activities || activities.length === 0) {
    return NextResponse.json({ insights: ['No activities logged in the last 2 weeks — log your first session to get personalised coaching tips!'] });
  }

  const summary = activities.map((a: Record<string, unknown>) => {
    const typeLabel = EXERCISE_TYPE_LABELS[a.exercise_type as keyof typeof EXERCISE_TYPE_LABELS] ?? a.exercise_type;
    const sub = a.exercise_type === 'run'
      ? combinedRunTypeLabel(a.run_type as never, a.run_type_modifier as never)
      : subTypeLabel(a.sub_type as string);
    const pace = a.pace_min_km as number | null;
    const parts = [
      a.date,
      sub ? `${typeLabel} (${sub})` : typeLabel,
      `${a.duration_minutes}min`,
      a.distance_km ? `${a.distance_km}km` : null,
      a.effort ? `effort ${a.effort}/10` : null,
      pace ? `pace ${Math.floor(pace)}:${String(Math.round((pace % 1) * 60)).padStart(2, '0')}/km` : null,
      a.avg_hr ? `${a.avg_hr}bpm` : null,
      a.intensity_minutes ? `${a.intensity_minutes}min intensity` : null,
      a.elevation_gain_m ? `${a.elevation_gain_m}m elevation` : null,
    ].filter(Boolean);
    return parts.join(' · ');
  }).join('\n');

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let insights: string[] = [];
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `You are a supportive, practical sports coach. Based on the athlete's last 2 weeks of training below, give 3–4 short, specific, actionable coaching insights or tips. Be encouraging but honest. Focus on patterns, recovery, variety, effort distribution, or what to do next. Keep each insight to 1–2 sentences. Return ONLY a JSON array of strings, no other text.

Training data (last 14 days):
${summary}`,
      }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
    const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    insights = JSON.parse(cleaned);
    if (!Array.isArray(insights)) throw new Error('not an array');
  } catch (err) {
    console.error('Training insights error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    insights = [`DEBUG: ${msg}`];
  }

  return NextResponse.json({ insights });
}
