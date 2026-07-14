// Hand-drawn line-art icons for specific subtypes that deserve a more distinctive
// doodle than their parent exercise type's shared icon (see EXERCISE_TYPE_ICONS in
// shareIcons.ts). Same visual language as lucide-react: 24x24, stroke-based, round caps.
// Typed (via cast) as LucideIcon so it's interchangeable with the real lucide icons at
// call sites that pick between the two.
import type { LucideIcon } from 'lucide-react';

type IconProps = { size?: number; className?: string };

// Stick + flat foot + ball — originally Golf's doodle, now Hockey's (a hockey stick reads
// the same way: long shaft, angled blade at the bottom, puck/ball beside it).
function HockeyIconComponent({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      <path d="M11 2 6 18" />
      <path d="M6 18 1 18" />
      <circle cx="17" cy="19" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
const HockeyIcon = HockeyIconComponent as unknown as LucideIcon;

// Golf hole: flagstick + pennant, with the ball resting beside it.
function GolfIconComponent({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      <path d="M6 21V3" />
      <path d="M6 3 14 6.5 6 10Z" fill="currentColor" stroke="none" />
      <circle cx="17" cy="20" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
const GolfIcon = GolfIconComponent as unknown as LucideIcon;

// Soccer ball: circle outline, a centre pentagon, and seam lines running out to the edge.
function FootballIconComponent({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7 15.5 9.5 14 13.5 10 13.5 8.5 9.5Z" />
      <path d="M12 7V3.5" />
      <path d="M15.5 9.5 19 8" />
      <path d="M14 13.5 16.5 17.5" />
      <path d="M10 13.5 7.5 17.5" />
      <path d="M8.5 9.5 5 8" />
    </svg>
  );
}
const FootballIcon = FootballIconComponent as unknown as LucideIcon;

export const SUBTYPE_ICON_OVERRIDES: Record<string, LucideIcon> = {
  hockey: HockeyIcon,
  golf: GolfIcon,
  football: FootballIcon,
};
