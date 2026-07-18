'use client';
import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { otherAccounts, SavedAccount } from '@/lib/accountSwitcher';
import Avatar from './Avatar';
import Link from 'next/link';

/** Dropdown showing every account saved on this device — switch instantly (no
 *  password needed, as long as that account's saved session is still valid),
 *  add another account, or remove a saved one.
 *
 *  `compact` swaps the trigger for a small bare-panda + name badge (used in page
 *  headers other than Dash, which already has its own full profile row) and
 *  right-aligns the dropdown so it doesn't run off the edge of the screen. */
export default function AccountSwitcher({ direction = 'down', compact = false }: { direction?: 'up' | 'down'; compact?: boolean }) {
  const { user, switchToAccount, removeSavedAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState('');

  const others: SavedAccount[] = user ? otherAccounts(user.id) : [];
  const displayName = user?.user_metadata?.username || user?.email || '';

  const handleSwitch = async (a: SavedAccount) => {
    setSwitching(a.userId);
    setError('');
    const { error } = await switchToAccount(a.accessToken, a.refreshToken);
    if (error) {
      setError(`Couldn't switch to ${a.email} — try signing in again.`);
      setSwitching(null);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={compact
          ? 'flex items-center gap-1.5 px-1.5 py-1 rounded-lg hover:bg-[#1E293B] transition-colors'
          : 'flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#0F172A] transition-colors'}
      >
        <Avatar url={user?.user_metadata?.avatar_url} color={user?.user_metadata?.avatar_color} size={compact ? 20 : 28} bare={compact} />
        <span className={compact ? 'text-[11px] text-[#94A3B8] truncate max-w-[80px]' : 'text-xs text-[#94A3B8] truncate flex-1'}>{compact ? displayName : user?.email}</span>
        {!compact && <span className="text-[#475569] text-xs">{open ? '▲' : '▼'}</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={`absolute w-full min-w-[220px] rounded-lg border border-[#334155] bg-[#1E293B] shadow-xl z-50 py-1.5 ${compact ? 'right-0' : 'left-0'} ${direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
            {compact && (
              <Link
                href="/profile"
                className="block px-3 py-1.5 text-xs text-white hover:text-blue-300 transition-colors"
                onClick={() => setOpen(false)}
              >
                View Profile
              </Link>
            )}
            {others.length > 0 && (
              <>
                <p className="px-3 py-1 text-[10px] text-[#475569] uppercase tracking-wide">Switch account</p>
                {others.map(a => (
                  <div key={a.userId} className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#0F172A] transition-colors">
                    <button
                      onClick={() => handleSwitch(a)}
                      disabled={switching === a.userId}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    >
                      <Avatar url={a.avatarUrl} color={a.avatarColor} size={24} />
                      <span className="text-xs text-white truncate">{switching === a.userId ? 'Switching…' : `Switch to ${a.username || a.email}`}</span>
                    </button>
                    <button
                      onClick={() => removeSavedAccount(a.userId)}
                      aria-label={`Remove ${a.email} from this device`}
                      className="text-[#475569] hover:text-red-400 text-xs px-1"
                    >✕</button>
                  </div>
                ))}
                <div className="my-1 border-t border-[#334155]" />
              </>
            )}
            {error && <p className="px-3 py-1 text-[11px] text-red-400">{error}</p>}
            <Link
              href="/login?addAccount=1"
              className="block px-3 py-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              onClick={() => setOpen(false)}
            >
              + Add another account
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
