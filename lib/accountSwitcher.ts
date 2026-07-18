import type { Session } from '@supabase/supabase-js';

/** A saved login, enough to silently restore the session via supabase.auth.setSession()
 *  without asking for a password again (as long as the refresh token is still valid). */
export interface SavedAccount {
  userId: string;
  email: string;
  username?: string | null;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  accessToken: string;
  refreshToken: string;
}

const KEY = 'sportlog_saved_accounts';

export function getSavedAccounts(): SavedAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: SavedAccount[]) {
  window.localStorage.setItem(KEY, JSON.stringify(accounts));
}

/** Upserts the given session into the saved-accounts list, keyed by user id.
 *  Called whenever the auth state changes so every account you've ever logged
 *  into on this device stays switchable (until its refresh token is invalidated). */
export function rememberSession(session: Session) {
  if (typeof window === 'undefined' || !session.user.email) return;
  const accounts = getSavedAccounts();
  const next: SavedAccount = {
    userId: session.user.id,
    email: session.user.email,
    username: (session.user.user_metadata?.username as string | undefined) ?? null,
    avatarUrl: (session.user.user_metadata?.avatar_url as string | undefined) ?? null,
    avatarColor: (session.user.user_metadata?.avatar_color as string | undefined) ?? null,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
  };
  const filtered = accounts.filter(a => a.userId !== next.userId);
  writeAccounts([...filtered, next]);
}

export function forgetAccount(userId: string) {
  writeAccounts(getSavedAccounts().filter(a => a.userId !== userId));
}

/** Every saved account except the one currently signed in. */
export function otherAccounts(currentUserId: string | undefined): SavedAccount[] {
  return getSavedAccounts().filter(a => a.userId !== currentUserId);
}
