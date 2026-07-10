'use client';
import { useRouter } from 'next/navigation';

const ENCOURAGEMENTS = [
  'Great effort', 'Well done', 'Good job', 'Great mahi', 'Awesome work',
  'Amazing', 'Nice mahi', 'So good', "You're amazing", "You're incredible",
  'Keep it up', 'Good effort',
];

/** Picks once per mount so the title doesn't shuffle on re-render. */
export function randomEncouragement(): string {
  return ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
}

interface Props {
  title: string; // pass a value from randomEncouragement(), chosen once by the caller on save
  onClose: () => void;
}

/** Congrats popup shown after logging any activity — dismiss via Yay!, "View in Activity
 *  Log", or by clicking outside the card. */
export default function ActivitySavedModal({ title, onClose }: Props) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="w-full max-w-sm bg-[#1E293B] border border-blue-500/40 rounded-2xl p-6 text-center" onClick={e => e.stopPropagation()}>
        <div className="text-5xl mb-2">🎉</div>
        <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>{title}!</h2>
        <div className="flex flex-col gap-2 mt-5">
          <button onClick={onClose} className="btn-primary w-full">YAY! 🎊</button>
          <button onClick={() => { onClose(); router.push('/activity-log'); }} className="btn-secondary w-full">View in Activity Log</button>
        </div>
      </div>
    </div>
  );
}
