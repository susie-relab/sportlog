'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import Avatar from '@/components/Avatar';
import { uploadImages, deleteImage } from '@/lib/images';

export default function ProfilePage() {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const flash = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  useEffect(() => {
    if (user?.user_metadata?.username) setUsername(user.user_metadata.username);
    setAvatarUrl(user?.user_metadata?.avatar_url ?? null);
  }, [user]);

  const handleUpdateUsername = async () => {
    if (!username.trim()) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { ...user?.user_metadata, username: username.trim() } });
    setSaving(false);
    flash(error ? error.message : 'Display name updated!', !error);
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) return;
    if (newPassword !== confirmPassword) return flash('Passwords do not match.', false);
    if (newPassword.length < 8) return flash('Password must be at least 8 characters.', false);
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    flash(error ? error.message : 'Password updated!', !error);
    if (!error) { setNewPassword(''); setConfirmPassword(''); }
  };

  const handlePickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const [url] = await uploadImages(user.id, [file]);
      const prev = avatarUrl;
      const { error } = await supabase.auth.updateUser({ data: { ...user.user_metadata, avatar_url: url } });
      if (error) throw error;
      setAvatarUrl(url);
      if (prev) deleteImage(prev); // clean up the old one
      flash('Photo updated!', true);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Upload failed', false);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeAvatar = async () => {
    if (!user) return;
    const prev = avatarUrl;
    setAvatarUrl(null);
    await supabase.auth.updateUser({ data: { ...user.user_metadata, avatar_url: null } });
    if (prev) deleteImage(prev);
    flash('Reverted to default panda 🐼', true);
  };

  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-1">Profile</h1>
      <p className="text-sm text-[#64748B] mb-5">{user?.email}</p>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg border text-sm ${msg.ok ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-red-900/40 border-red-700 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      {/* Avatar */}
      <div className="card mb-4 flex items-center gap-4">
        <Avatar url={avatarUrl} size={72} />
        <div className="flex flex-col gap-2">
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-primary text-sm px-4 py-2 disabled:opacity-60">
            {uploading ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Upload photo'}
          </button>
          {avatarUrl && (
            <button onClick={removeAvatar} className="text-xs text-[#64748B] hover:text-white transition-colors">Use default panda</button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePickAvatar} />
        </div>
      </div>

      {/* Display name */}
      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-white mb-3">Display Name</h2>
        <input className="input mb-3" placeholder="Enter a username" value={username} onChange={e => setUsername(e.target.value)} />
        <button onClick={handleUpdateUsername} disabled={saving} className="btn-primary w-full">Save Display Name</button>
      </div>

      {/* Change password */}
      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-white mb-3">Change Password</h2>
        <div className="flex flex-col gap-3">
          <input type="password" className="input" placeholder="New password (min 8 chars)" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          <input type="password" className="input" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          <button onClick={handleUpdatePassword} disabled={saving || !newPassword} className="btn-primary w-full">Update Password</button>
        </div>
      </div>

      <Link href="/settings" className="flex items-center justify-between card hover:border-[#475569] transition-colors">
        <span className="text-sm font-semibold text-white">⚙ Settings</span>
        <span className="text-[#64748B]">›</span>
      </Link>
    </div>
  );
}
