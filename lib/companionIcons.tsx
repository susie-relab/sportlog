// Hand-drawn line-art icons for the universal "who with" companion tags (see Companion /
// COMPANION_EMOJI in types/index.ts) — same visual language as subtypeIcons.tsx: 24x24,
// stroke-based, round caps, built on the same Svg/makeIcon helpers.
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Companion } from '@/types';

type IconProps = { size?: number; className?: string };

function Svg({ size = 24, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

function makeIcon(render: (props: IconProps) => ReactNode): LucideIcon {
  return ((props: IconProps) => render(props)) as unknown as LucideIcon;
}

const FriendsIcon = makeIcon(({ size, className }) => (
  // Two overlapping figures — one slightly forward, one behind.
  <Svg size={size} className={className}>
    <circle cx="15" cy="7" r="3" />
    <path d="M9 20c0-4 2.5-6 6-6s6 2 6 6" />
    <circle cx="7" cy="9" r="2.5" />
    <path d="M2 20c0-3.5 2-5.5 5-5.5" />
  </Svg>
));

const FamilyIcon = makeIcon(({ size, className }) => (
  // Taller adult figure + a shorter child figure beside it.
  <Svg size={size} className={className}>
    <circle cx="7" cy="6" r="3" />
    <path d="M2 20c0-5 2-8 5-8s5 3 5 8" />
    <circle cx="17" cy="11" r="2" />
    <path d="M14 20c0-3 1.3-4.5 3-4.5s3 1.5 3 4.5" />
  </Svg>
));

const KidsIcon = makeIcon(({ size, className }) => (
  // A single small figure, arms and legs spread playfully.
  <Svg size={size} className={className}>
    <circle cx="12" cy="6" r="3" />
    <path d="M12 9v7" />
    <path d="M12 11 8 8" />
    <path d="M12 11 16 8" />
    <path d="M12 16 9 21" />
    <path d="M12 16 15 21" />
  </Svg>
));

const PetsIcon = makeIcon(({ size, className }) => (
  // A paw print — main pad plus four toe pads, filled for a clearer silhouette.
  <Svg size={size} className={className}>
    <ellipse cx="12" cy="16" rx="4.5" ry="3.5" fill="currentColor" stroke="none" />
    <circle cx="6.5" cy="9.5" r="2" fill="currentColor" stroke="none" />
    <circle cx="11" cy="6.5" r="2" fill="currentColor" stroke="none" />
    <circle cx="16" cy="6.5" r="2" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="10.5" r="2" fill="currentColor" stroke="none" />
  </Svg>
));

export const COMPANION_ICON_OVERRIDES: Record<Companion, LucideIcon> = {
  friends: FriendsIcon,
  family: FamilyIcon,
  kids: KidsIcon,
  pets: PetsIcon,
};
