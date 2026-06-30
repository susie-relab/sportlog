'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const [username, setUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const flash = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleUpdateUsername = async () => {
    if (!username.trim()) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { username: username.trim() } });
    setSaving(false);
    flash(error ? error.message : 'Username updated!', !error);
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setSaving(false);
    flash(error ? error.message : 'Confirmation sent to new email address.', !error);
    if (!error) setNewEmail('');
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) return;
    if (newPassword !== confirmPassword) return flash('Passwords do not match.', false);
    if (newPassword.length < 8) return flash('Password must be at least 8 characters.', false);
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    flash(error ? error.message : 'Password updated!', !error);
    if (!error) { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }
  };

  useEffect(() => {
    if (user?.user_metadata?.username) setUsername(user.user_metadata.username);
  }, [user]);

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white mb-1">Profile</h1>
      <p className="text-sm text-[#64748B] mb-5">{user?.email}</p>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg border text-sm ${msg.ok ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-red-900/40 border-red-700 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      {/* Username */}
      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-white mb-3">Display Name</h2>
        <input
          className="input mb-3"
          placeholder="Enter a username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <button onClick={handleUpdateUsername} disabled={saving} className="btn-primary w-full">
          Save Username
        </button>
      </div>

      {/* Change email */}
      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-white mb-3">Change Email</h2>
        <p className="text-xs text-[#64748B] mb-3">Current: {user?.email}</p>
        <input
          type="email"
          className="input mb-3"
          placeholder="New email address"
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
        />
        <button onClick={handleUpdateEmail} disabled={saving || !newEmail} className="btn-primary w-full">
          Update Email
        </button>
      </div>

      {/* Change password */}
      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-white mb-3">Change Password</h2>
        <div className="flex flex-col gap-3">
          <input
            type="password"
            className="input"
            placeholder="New password (min 8 chars)"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
          <input
            type="password"
            className="input"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
          />
          <button onClick={handleUpdatePassword} disabled={saving || !newPassword} className="btn-primary w-full">
            Update Password
          </button>
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={signOut}
        className="w-full py-3 rounded-lg border border-red-800/50 text-red-400 text-sm font-medium hover:bg-red-900/20 transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
