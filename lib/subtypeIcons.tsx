// Hand-drawn line-art icons for specific subtypes that deserve a more distinctive
// doodle than their parent exercise type's shared icon (see EXERCISE_TYPE_ICONS in
// shareIcons.ts). Same visual language as lucide-react: 24x24, stroke-based, round caps.
// Typed (via cast) as LucideIcon so it's interchangeable with the real lucide icons at
// call sites that pick between the two.
import type { LucideIcon } from 'lucide-react';

function GolfIconComponent({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      <path d="M11 2 6 18" />
      <path d="M6 18 2 19" />
      <circle cx="17" cy="19" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
const GolfIcon = GolfIconComponent as unknown as LucideIcon;

export const SUBTYPE_ICON_OVERRIDES: Record<string, LucideIcon> = {
  golf: GolfIcon,
};
