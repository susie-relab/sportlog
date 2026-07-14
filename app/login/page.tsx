'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import SportLogRunMark from '@/components/SportLogRunMark';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'request'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Request-access form
  const [req, setReq] = useState({ email: '', firstName: '', lastName: '', referral: '', sports: '', reason: '' });
  const [reqState, setReqState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const setReqField = (k: keyof typeof req) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setReq(prev => ({ ...prev, [k]: e.target.value }));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/add');
    }
  };

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!req.email.trim()) { setError('Please enter your email.'); return; }
    setReqState('sending'); setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'access_request', ...req }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to send');
      setReqState('sent');
    } catch (err) {
      setReqState('error');
      setError(err instanceof Error ? err.message : 'Failed to send');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 flex flex-col items-center">
          <SportLogRunMark size={180} />
          <p className="text-[#64748B] text-sm mt-1 font-medium">Exercise Tracker</p>
        </div>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-2 mb-4 p-1 rounded-xl border border-[#334155]">
          <button onClick={() => { setMode('login'); setError(''); }}
            className={`py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'login' ? 'bg-blue-600 text-white' : 'text-[#94A3B8]'}`}>Log in</button>
          <button onClick={() => { setMode('request'); setError(''); }}
            className={`py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'request' ? 'bg-blue-600 text-white' : 'text-[#94A3B8]'}`}>Request a login</button>
        </div>

        <div className="card">
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" className="input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" className="btn-primary w-full mt-1" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : reqState === 'sent' ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-sm text-white font-semibold mb-1">Request sent!</p>
              <p className="text-xs text-[#64748B]">We&apos;ll be in touch by email if you&apos;re approved.</p>
              <button onClick={() => setMode('login')} className="text-xs text-blue-400 hover:text-blue-300 mt-4">← Back to log in</button>
            </div>
          ) : (
            <form onSubmit={submitRequest} className="flex flex-col gap-3">
              <p className="text-xs text-[#64748B]">SportLog is invite-only for now. Tell us a bit about you and we&apos;ll be in touch.</p>
              <div className="grid grid-cols-2 gap-2">
                <input className="input" placeholder="First name" value={req.firstName} onChange={setReqField('firstName')} required />
                <input className="input" placeholder="Last name" value={req.lastName} onChange={setReqField('lastName')} required />
              </div>
              <input type="email" className="input" placeholder="Your email" value={req.email} onChange={setReqField('email')} required />
              <input className="input" placeholder="Who referred you?" value={req.referral} onChange={setReqField('referral')} />
              <input className="input" placeholder="Sports / activities you'd track" value={req.sports} onChange={setReqField('sports')} />
              <textarea className="input" rows={3} placeholder="Why would you like an account?" value={req.reason} onChange={setReqField('reason')} style={{ resize: 'vertical' }} />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={reqState === 'sending'}>
                {reqState === 'sending' ? 'Sending…' : 'Request access'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
