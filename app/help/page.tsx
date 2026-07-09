'use client';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import FeedbackForm from '@/components/FeedbackForm';

export default function HelpPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-xl font-bold text-white">Help</h1>
        <Link href="/dash" aria-label="Close" className="text-[#64748B] hover:text-white text-xl leading-none">✕</Link>
      </div>
      <p className="text-sm text-[#64748B] mb-5">Feedback, feature requests, and bug reports</p>

      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-1">Contact the developer</h2>
        <p className="text-xs text-[#64748B] mb-3">Spotted a bug or have an idea? Send it straight across.</p>
        <FeedbackForm defaultEmail={user?.email ?? undefined} defaultName={user?.user_metadata?.username ?? undefined} />
      </div>
    </div>
  );
}
