'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import Avatar, { AVATAR_COLORS, AvatarColorKey } from '@/components/Avatar';
import Toast from '@/components/Toast';
import AccountSwitcher from '@/components/AccountSwitcher';
import { uploadImages, deleteImage } from '@/lib/images';
import { openDatePicker, calcAge } from '@/lib/utils';
import { Activity, EXERCISE_TYPE_ORDER, EXERCISE_TYPE_LABELS, allFavouriteItems, topActivityCounts, FavouriteItem } from '@/types';

export default function ProfilePage() {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [birthday, setBirthday] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarColor, setAvatarColor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [favourites, setFavourites] = useState<string[]>([]);
  const [showFavPicker, setShowFavPicker] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const flash = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  useEffect(() => {
    if (user?.user_metadata?.username) setUsername(user.user_metadata.username);
    if (user?.user_metadata?.birthday) setBirthday(user.user_metadata.birthday);
    setAvatarUrl(user?.user_metadata?.avatar_url ?? null);
    setAvatarColor(user?.user_metadata?.avatar_color ?? null);
    setFavourites(user?.user_metadata?.favourite_activities ?? []);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase.from('activities').select('*').eq('user_id', user.id).then(({ data }) => setActivities((data as Activity[]) || []));
  }, [user]);

  const { topTypes, topSubtypes } = topActivityCounts(activities, 3);
  const allItems = allFavouriteItems();
  const favItems = favourites.map(k => allItems.find(i => i.key === k)).filter(Boolean) as FavouriteItem[];

  const toggleFavourite = (key: string) => {
    setFavourites(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key);
      if (prev.length >= 5) return prev;
      return [...prev, key];
    });
  };

  const saveFavourites = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { ...user?.user_metadata, favourite_activities: favourites } });
    setSaving(false);
    flash(error ? error.message : 'Favourites saved!', !error);
    if (!error) setShowFavPicker(false);
  };

  const handleUpdateUsername = async () => {
    if (!username.trim()) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { ...user?.user_metadata, username: username.trim(), birthday: birthday || null } });
    setSaving(false);
    flash(error ? error.message : 'Profile updated!', !error);
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

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setSaving(false);
    flash(error ? error.message : 'Confirmation sent to new email address.', !error);
    if (!error) setNewEmail('');
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

  const pickAvatarColor = async (key: AvatarColorKey) => {
    if (!user) return;
    const hex = AVATAR_COLORS[key];
    setAvatarColor(hex);
    const { error } = await supabase.auth.updateUser({ data: { ...user.user_metadata, avatar_color: hex } });
    flash(error ? error.message : 'Panda colour updated!', !error);
  };

  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-xl font-bold text-white">Profile</h1>
        <Link href="/dash" aria-label="Close" className="text-[#64748B] hover:text-white text-xl leading-none">✕</Link>
      </div>
      <p className="text-sm text-[#64748B] mb-5">{user?.email}</p>

      <Toast msg={msg} />

      {/* Avatar */}
      <div className="card mb-4 flex items-center gap-4">
        <Avatar url={avatarUrl} color={avatarColor} size={72} />
        <div className="flex flex-col gap-2">
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-primary text-sm px-4 py-2 disabled:opacity-60">
            {uploading ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Upload photo'}
          </button>
          {avatarUrl && (
            <button onClick={removeAvatar} className="text-xs text-[#64748B] hover:text-white transition-colors">Use default panda</button>
          )}
          {!avatarUrl && (
            <div className="flex gap-1.5 mt-1">
              {(Object.keys(AVATAR_COLORS) as AvatarColorKey[]).map(key => (
                <button
                  key={key}
                  onClick={() => pickAvatarColor(key)}
                  aria-label={`${key} panda`}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${avatarColor === AVATAR_COLORS[key] || (!avatarColor && key === 'blue') ? 'border-white' : 'border-transparent hover:border-[#475569]'}`}
                  style={{ background: AVATAR_COLORS[key] }}
                />
              ))}
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePickAvatar} />
        </div>
      </div>

      {/* Accounts — switch between multiple logins saved on this device */}
      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-white mb-3">Switch Profile</h2>
        <AccountSwitcher />
      </div>

      {/* Display name + age */}
      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-white mb-3">Display Name</h2>
        <input className="input mb-3" placeholder="Enter a username" value={username} onChange={e => setUsername(e.target.value)} />
        <h2 className="text-sm font-semibold text-white mb-3">Birthday <span className="text-[#64748B] font-normal">(optional)</span></h2>
        <div className="flex items-center gap-3 mb-3">
          <input type="date" className="input flex-1" value={birthday} onClick={openDatePicker} onChange={e => setBirthday(e.target.value)} />
          {birthday && <span className="text-sm text-[#94A3B8] whitespace-nowrap">Age: {calcAge(birthday)}</span>}
        </div>
        <button onClick={handleUpdateUsername} disabled={saving} className="btn-primary w-full">Save Profile</button>
      </div>

      {/* Favourite activities */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Favourite Activities <span className="text-[#64748B] font-normal">(pick up to 5)</span></h2>
          <button onClick={() => setShowFavPicker(v => !v)} className="text-xs text-blue-400 hover:text-blue-300">{showFavPicker ? 'Done' : 'Edit'}</button>
        </div>
        {!showFavPicker ? (
          favItems.length === 0 ? (
            <p className="text-sm text-[#475569]">None yet — tap Edit to choose.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {favItems.map(i => (
                <div key={i.key} className="text-sm text-white">{i.emoji} {i.label}</div>
              ))}
            </div>
          )
        ) : (
          <>
            <p className="text-xs text-[#64748B] mb-3">{favourites.length}/5 selected</p>
            <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
              {EXERCISE_TYPE_ORDER.map(type => {
                const items = allItems.filter(i => i.type === type);
                return (
                  <div key={type}>
                    <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">{EXERCISE_TYPE_LABELS[type]}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map(i => {
                        const active = favourites.includes(i.key);
                        return (
                          <button
                            key={i.key}
                            onClick={() => toggleFavourite(i.key)}
                            disabled={!active && favourites.length >= 5}
                            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all disabled:opacity-30 ${active ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-[#334155] text-[#94A3B8] hover:border-[#475569]'}`}
                          >
                            {i.emoji} {i.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={saveFavourites} disabled={saving} className="btn-primary w-full mt-4">Save Favourites</button>
          </>
        )}
      </div>

      {/* Top 5 — most logged in the past 3 months */}
      {(topTypes.length > 0 || topSubtypes.length > 0) && (
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-white mb-3">Top 5 <span className="text-[#64748B] font-normal">(past 3 months)</span></h2>
          {topTypes.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1.5">Top 5 exercise types:</p>
              <div className="flex flex-col gap-1">
                {topTypes.map(({ item, count }) => (
                  <div key={item.key} className="flex items-center justify-between text-sm">
                    <span className="text-white">{item.emoji} {item.label}</span>
                    <span className="text-[#64748B]">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {topSubtypes.length > 0 && (
            <div>
              <p className="text-xs text-[#64748B] uppercase tracking-wide mb-1.5">Top 5 session types:</p>
              <div className="flex flex-col gap-1">
                {topSubtypes.map(({ item, count }) => (
                  <div key={item.key} className="flex items-center justify-between text-sm">
                    <span className="text-white">{item.emoji} {item.label}</span>
                    <span className="text-[#64748B]">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Change email */}
      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-white mb-3">Change Email</h2>
        <p className="text-xs text-[#64748B] mb-3">Current: {user?.email}</p>
        <input type="email" className="input mb-3" placeholder="New email address" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
        <button onClick={handleUpdateEmail} disabled={saving || !newEmail} className="btn-primary w-full">Update Email</button>
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
