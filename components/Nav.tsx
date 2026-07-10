'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, LayoutDashboard, List, Footprints, TrendingUp, Award, BookOpen, Target, Upload, Download, LogOut, HelpCircle, User } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useDirtyForm } from './DirtyFormContext';

const tabs = [
  { href: '/add', label: 'Add', icon: Plus },
  { href: '/activity-log', label: 'Log', icon: List },
  { href: '/run-log', label: 'Runs', icon: Footprints },
  { href: '/total-stats', label: 'Stats', icon: TrendingUp },
  { href: '/dash', label: 'Dash', icon: LayoutDashboard },
  { href: '/training-plan', label: 'Plan', icon: Target },
  { href: '/pbs', label: "PB's", icon: Award },
  { href: '/notes', label: 'Notes', icon: BookOpen },
  { href: '/import', label: 'Import', icon: Upload },
  { href: '/export', label: 'Export', icon: Download },
];

// Shown in the desktop sidebar only — the mobile bottom nav is already full.
const desktopOnlyTabs = [
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/help', label: 'Help', icon: HelpCircle },
];

export default function Nav() {
  const path = usePathname();
  const { user, signOut } = useAuth();
  const { isDirty, setShowWarning, setPendingHref } = useDirtyForm();

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (isDirty && path === '/add' && href !== '/add') {
      e.preventDefault();
      setPendingHref(href);
      setShowWarning(true);
    }
  };

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-56 min-h-screen bg-[#1E293B] border-r border-[#334155] p-4 fixed top-0 left-0">
        <div className="mb-8 mt-2">
          <h1 className="text-2xl font-extrabold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>SportLog</h1>
          <p className="text-xs text-[#64748B] mt-0.5 font-medium" style={{ fontFamily: 'var(--font-body)' }}>Exercise Tracker</p>
        </div>
        <div className="flex flex-col gap-1 flex-1">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = path === href || path.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                onClick={e => handleNavClick(e, href)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-[#94A3B8] hover:bg-[#334155] hover:text-white'
                }`}
              >
                <Icon size={18} />
                {label === '14 Days' ? '14 Day Stats' : label === 'Log' ? 'Activity Log' : label === 'Runs' ? 'Run Log' : label === 'Plan' ? 'Training Plan' : label}
              </Link>
            );
          })}
          <div className="my-2 border-t border-[#334155]" />
          {desktopOnlyTabs.map(({ href, label, icon: Icon }) => {
            const active = path === href || path.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                onClick={e => handleNavClick(e, href)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-[#94A3B8] hover:bg-[#334155] hover:text-white'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </div>
        {user && (
          <div className="mt-4 pt-4 border-t border-[#334155]">
            <p className="text-xs text-[#475569] truncate mb-2">{user.email}</p>
            <button onClick={signOut} className="flex items-center gap-2 text-xs text-[#64748B] hover:text-white transition-colors">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        )}
      </nav>

      {/* Mobile bottom nav — hide Import and Export tabs */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1E293B] border-t border-[#334155] z-50">
        <div className="flex">
          {tabs.filter(t => t.href !== '/import' && t.href !== '/export').map(({ href, label, icon: Icon }) => {
            const active = path === href || path.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 text-[10px] font-medium transition-colors ${
                  active ? 'text-blue-400' : 'text-[#64748B]'
                }`}
              >
                <Icon size={20} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
