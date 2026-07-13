// Daily cron route (see vercel.json) that emails a happy-birthday note to any user
// whose stored birthday (Profile page) matches today's month/day. Requires the same
// server-only env vars as the recap email:
//   SUPABASE_SERVICE_ROLE_KEY — list users (never exposed to client)
//   RESEND_API_KEY / RESEND_FROM — same email service as the contact form
//   CRON_SECRET — Vercel injects this as a Bearer token on cron invocations
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TIMEZONE = process.env.RECAP_TIMEZONE || 'Pacific/Auckland';

type AdminUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

function todayInTz(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date()); // YYYY-MM-DD
}

const esc = (s: string) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function birthdayHtml(name: string, appUrl: string): string {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0F172A;color:#E2E8F0;padding:24px;border-radius:12px;max-width:520px;text-align:center;">
    <div style="font-size:40px;">🎉🎂🎉</div>
    <h2 style="margin:12px 0 4px;color:#fff;">Happy Birthday${name ? `, ${esc(name)}` : ''}!</h2>
    <p style="margin:0 0 16px;color:#94A3B8;font-size:14px;">Another year, another lap around the sun — literally, if you've been logging those runs.</p>
    <p style="margin:0 0 20px;color:#CBD5E1;font-size:14px;">Here's to more PBs, more miles, and more reasons to celebrate. Go treat yourself today — a rest day counts too. 😉</p>
    <p style="margin-top:8px;"><a href="${appUrl}/dash" style="color:#60A5FA;font-size:13px;">Open SportLog →</a></p>
    <p style="margin-top:16px;font-size:11px;color:#475569;">From the whole team at SportLogRun 🏃</p>
  </div>`;
}

export async function GET(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'SportLog <onboarding@resend.dev>';
  const appUrl = process.env.APP_URL || 'https://sportlogrun.app.nz';

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!serviceKey || !supabaseUrl || !resendKey) {
    return Response.json({ error: 'Birthday emails are not configured (missing env vars).' }, { status: 503 });
  }

  try {
    const adminHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const todayISO = todayInTz();
    const todayMonthDay = todayISO.slice(5); // "MM-DD"

    // Page through all users; only ones with a matching birthday get anything.
    const users: AdminUser[] = [];
    for (let page = 1; page <= 20; page++) {
      const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: adminHeaders });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return Response.json({ error: `Failed to list users (${res.status})`, detail: body.slice(0, 300) }, { status: 200 });
      }
      const json = await res.json();
      const batch = (Array.isArray(json) ? json : json.users) as AdminUser[] | undefined;
      if (!batch || batch.length === 0) break;
      users.push(...batch);
      if (batch.length < 200) break;
    }

    let sent = 0;
    const errors: string[] = [];

    for (const u of users) {
      if (!u.email) continue;
      const meta = u.user_metadata || {};
      const birthday = meta.birthday;
      if (typeof birthday !== 'string' || birthday.slice(5) !== todayMonthDay) continue;

      const name = typeof meta.username === 'string' ? meta.username : '';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: u.email, subject: '🎉 Happy Birthday from SportLogRun!', html: birthdayHtml(name, appUrl) }),
      });
      if (res.ok) sent++;
      else errors.push(`${u.email}: send failed (${res.status})`);
    }

    return Response.json({ date: todayISO, usersChecked: users.length, sent, errors });
  } catch (err) {
    // Surface the real cause as JSON (200) so it shows in the cron logs instead of a bare 502.
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack?.split('\n').slice(0, 4).join(' | ') : undefined;
    return Response.json({ error: 'Birthday email run failed', message, stack }, { status: 200 });
  }
}
