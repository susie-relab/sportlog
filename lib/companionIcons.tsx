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

const TeamIcon = makeIcon(({ size, className }) => (
  // A trophy/shield-style badge — reads as "team"/organised group rather than casual friends.
  <Svg size={size} className={className}>
    <path d="M7 4h10v6a5 5 0 0 1-10 0V4Z" />
    <path d="M7 6H4a3 3 0 0 0 3 5" />
    <path d="M17 6h3a3 3 0 0 1-3 5" />
    <path d="M12 15v3" />
    <path d="M9 21h6" />
    <path d="M10 18h4v3h-4Z" />
  </Svg>
));

const PartnerIcon = makeIcon(({ size, className }) => (
  // A simple filled heart — reads as "with partner" distinct from the friends/family figures.
  <Svg size={size} className={className}>
    <path d="M12 20.5s-7.2-4.4-9.6-8.7C.8 8.2 2.4 4 6.4 4c2 0 3.6 1.1 5.6 3.4C14 5.1 15.6 4 17.6 4c4 0 5.6 4.2 4 7.8-2.4 4.3-9.6 8.7-9.6 8.7Z" fill="currentColor" stroke="none" />
  </Svg>
));

const FriendsIcon = makeIcon(({ size, className }) => (
  // Three stick figures holding hands — the outer two joining the middle one at the hand.
  <Svg size={size} className={className}>
    <circle cx="5" cy="6" r="2" />
    <path d="M5 8v7" />
    <path d="M5 11 8 13" />
    <path d="M5 15 3 21" />
    <path d="M5 15 7 20" />
    <circle cx="12" cy="4" r="2.3" />
    <path d="M12 6.3v9" />
    <path d="M12 9 8 13" />
    <path d="M12 9 16 13" />
    <path d="M12 15 10 21" />
    <path d="M12 15 14 21" />
    <circle cx="19" cy="6" r="2" />
    <path d="M19 8v7" />
    <path d="M19 11 16 13" />
    <path d="M19 15 17 20" />
    <path d="M19 15 21 21" />
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
  team: TeamIcon,
  partner: PartnerIcon,
  friends: FriendsIcon,
  family: FamilyIcon,
  kids: KidsIcon,
  pets: PetsIcon,
};
