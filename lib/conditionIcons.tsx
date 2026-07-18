// Hand-drawn doodle for weather/terrain conditions that don't have a good emoji equivalent
// (see WeatherCondition / CONDITION_EMOJI in types/index.ts). Same filled-silhouette style as
// the mud-splatter reference — a irregular splat blob with a few flung droplets.
import type { LucideIcon } from 'lucide-react';
import type { WeatherCondition } from '@/types';

type IconProps = { size?: number; className?: string };

function makeIcon(render: (props: IconProps) => React.ReactNode): LucideIcon {
  return ((props: IconProps) => render(props)) as unknown as LucideIcon;
}

const MuddyIcon = makeIcon(({ size = 24, className }) => (
  // Bright brown fill (solid, 100% opacity) with a thin darker-brown outline so it reads
  // clearly as "mud" next to the emoji condition icons rather than blending into black text.
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="#A0522D" stroke="#5C3317" strokeWidth={0.6} strokeLinejoin="round"
    className={className}
  >
    {/* Main splat body — an irregular blob, not a clean circle. */}
    <path d="M12 6.2c2.6-.3 4.3 1 4.9 2.6.9-.6 2.4-.3 2.8 1 .4 1.2-.4 2.1-1.4 2.4.9.9.8 2.4-.3 3.1-1.2.8-2.6.2-3.2-.7-.5 1.5-2 2.6-3.8 2.6-1.9 0-3.4-1.2-3.8-2.8-.8 1-2.3 1.2-3.3.3-1-.9-.9-2.3.1-3.1-1-.4-1.6-1.5-1.2-2.6.5-1.3 2-1.5 2.9-.8.3-1.8 2-3.3 4.3-2Z" />
    {/* Flung droplets around the main splat. */}
    <path d="M4.5 7.8c.9.2 1.4 1 1.2 1.8-.2.8-1.1 1.2-1.9 1-.9-.2-1.4-1-1.2-1.8.2-.8 1-1.2 1.9-1Z" />
    <path d="M19.5 5.5c.7 0 1.3.6 1.3 1.3s-.6 1.3-1.3 1.3-1.3-.6-1.3-1.3.6-1.3 1.3-1.3Z" />
    <path d="M8 17.8c.7.1 1.1.8.9 1.4-.1.7-.8 1.1-1.5.9-.6-.1-1-.8-.9-1.4.2-.7.8-1.1 1.5-.9Z" />
    <path d="M16.5 17.5c.6 0 1 .5 1 1.1s-.5 1-1.1 1-1-.5-1-1.1.5-1 1.1-1Z" />
  </svg>
));

const SunriseIcon = makeIcon(({ size = 24, className }) => (
  // Half-sun dome sitting on the horizon, rays fanning around its curve, an arrow rising
  // out of it toward a new day. Dawn gradient: bright yellow fading to a soft coral pink.
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <defs>
      <linearGradient id="condition-sunrise-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFDA55" />
        <stop offset="50%" stopColor="#FF9F40" />
        <stop offset="100%" stopColor="#FF7096" />
      </linearGradient>
    </defs>
    <path d="M6.5 18.5 A5.5 5.5 0 0 1 17.5 18.5 Z" fill="url(#condition-sunrise-grad)" />
    <line x1="3" y1="18.5" x2="21" y2="18.5" stroke="#FF9F40" strokeWidth={1.4} strokeLinecap="round" />
    <g stroke="#FFDA55" strokeWidth={0.9} strokeLinecap="round">
      <line x1="6.58" y1="17.55" x2="4.91" y2="17.25" />
      <line x1="7.24" y1="15.75" x2="5.77" y2="14.90" />
      <line x1="8.47" y1="14.29" x2="7.37" y2="12.99" />
      <line x1="10.12" y1="13.33" x2="9.54" y2="11.73" />
      <line x1="13.88" y1="13.33" x2="14.46" y2="11.73" />
      <line x1="15.54" y1="14.29" x2="16.63" y2="12.99" />
      <line x1="16.76" y1="15.75" x2="18.24" y2="14.90" />
      <line x1="17.42" y1="17.55" x2="19.09" y2="17.25" />
    </g>
    <path d="M12 11.8 L12 6.1" stroke="#F8FAFC" strokeWidth={1.1} strokeLinecap="round" />
    <path d="M8.8 9.3 L12 6.1 L15.2 9.3" fill="none" stroke="#F8FAFC" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));

const SunsetIcon = makeIcon(({ size = 24, className }) => (
  // Mirror of sunrise — half-sun dome hanging from the top edge, arrow falling toward the
  // horizon. Dusk gradient: muted gold fading to a deeper magenta-pink than sunrise's.
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <defs>
      <linearGradient id="condition-sunset-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFB454" />
        <stop offset="50%" stopColor="#FF6F61" />
        <stop offset="100%" stopColor="#D6478C" />
      </linearGradient>
    </defs>
    <path d="M6.5 5.5 A5.5 5.5 0 0 0 17.5 5.5 Z" fill="url(#condition-sunset-grad)" />
    <line x1="3" y1="18.5" x2="21" y2="18.5" stroke="#3B82F6" strokeWidth={1.4} strokeLinecap="round" />
    <g stroke="url(#condition-sunset-grad)" strokeWidth={0.9} strokeLinecap="round">
      <line x1="6.58" y1="6.46" x2="4.91" y2="6.75" />
      <line x1="7.24" y1="8.25" x2="5.77" y2="9.10" />
      <line x1="8.47" y1="9.71" x2="7.37" y2="11.02" />
      <line x1="10.12" y1="10.67" x2="9.54" y2="12.27" />
      <line x1="13.88" y1="10.67" x2="14.46" y2="12.27" />
      <line x1="15.54" y1="9.71" x2="16.63" y2="11.02" />
      <line x1="16.76" y1="8.25" x2="18.24" y2="9.10" />
      <line x1="17.42" y1="6.46" x2="19.09" y2="6.75" />
    </g>
    <path d="M12 12.2 L12 17.9" stroke="#F8FAFC" strokeWidth={1.1} strokeLinecap="round" />
    <path d="M8.8 14.7 L12 17.9 L15.2 14.7" fill="none" stroke="#F8FAFC" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));

const MorningIcon = makeIcon(({ size = 24, className }) => (
  // A plain clock face (no sun — that's sunrise/sunset's territory) with hands reading
  // roughly 8 o'clock, in a soft pale gold to suggest early daylight.
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="8.2" stroke="#F8FAFC" strokeWidth={1.6} />
    <line x1="12" y1="12" x2="12" y2="6.3" stroke="#F8FAFC" strokeWidth={1.4} strokeLinecap="round" />
    <line x1="12" y1="12" x2="9.58" y2="13.4" stroke="#F8FAFC" strokeWidth={1.8} strokeLinecap="round" />
    <circle cx="12" cy="12" r="1.1" fill="#F8FAFC" />
  </svg>
));

const AfternoonIcon = makeIcon(({ size = 24, className }) => (
  // Same clock face as morning, hour hand rotated to roughly 2 o'clock instead.
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="8.2" stroke="#F8FAFC" strokeWidth={1.6} />
    <line x1="12" y1="12" x2="12" y2="6.3" stroke="#F8FAFC" strokeWidth={1.4} strokeLinecap="round" />
    <line x1="12" y1="12" x2="14.42" y2="10.6" stroke="#F8FAFC" strokeWidth={1.8} strokeLinecap="round" />
    <circle cx="12" cy="12" r="1.1" fill="#F8FAFC" />
  </svg>
));

const NightIcon = makeIcon(({ size = 24, className }) => (
  // Tilted crescent moon (mask-based cut so it never depends on whatever's behind it,
  // unlike an "eraser circle" approach) plus a 5-point star, both plain white.
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <defs>
      <mask id="condition-night-crescent-mask" maskContentUnits="userSpaceOnUse">
        <rect x="0" y="0" width="24" height="24" fill="white" />
        <circle cx="-1.7" cy="0" r="6.5" fill="black" />
      </mask>
    </defs>
    <g transform="translate(12.5,10) scale(1.3) rotate(25)">
      <circle cx="0" cy="0" r="7" fill="#F8FAFC" mask="url(#condition-night-crescent-mask)" />
    </g>
    <path d="M5 6.4 L5.82 8.87 L8.42 8.89 L6.33 10.43 L7.12 12.91 L5 11.4 L2.88 12.91 L3.67 10.43 L1.58 8.89 L4.18 8.87 Z" fill="#F8FAFC" transform="translate(3.5,0)" />
  </svg>
));

export const CONDITION_ICON_OVERRIDES: Partial<Record<WeatherCondition, LucideIcon>> = {
  muddy: MuddyIcon,
  sunrise: SunriseIcon,
  morning: MorningIcon,
  afternoon: AfternoonIcon,
  sunset: SunsetIcon,
  night: NightIcon,
};
