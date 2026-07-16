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
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    {/* Main splat body — an irregular blob, not a clean circle. */}
    <path d="M12 6.2c2.6-.3 4.3 1 4.9 2.6.9-.6 2.4-.3 2.8 1 .4 1.2-.4 2.1-1.4 2.4.9.9.8 2.4-.3 3.1-1.2.8-2.6.2-3.2-.7-.5 1.5-2 2.6-3.8 2.6-1.9 0-3.4-1.2-3.8-2.8-.8 1-2.3 1.2-3.3.3-1-.9-.9-2.3.1-3.1-1-.4-1.6-1.5-1.2-2.6.5-1.3 2-1.5 2.9-.8.3-1.8 2-3.3 4.3-2Z" />
    {/* Flung droplets around the main splat. */}
    <path d="M4.5 7.8c.9.2 1.4 1 1.2 1.8-.2.8-1.1 1.2-1.9 1-.9-.2-1.4-1-1.2-1.8.2-.8 1-1.2 1.9-1Z" />
    <path d="M19.5 5.5c.7 0 1.3.6 1.3 1.3s-.6 1.3-1.3 1.3-1.3-.6-1.3-1.3.6-1.3 1.3-1.3Z" />
    <path d="M8 17.8c.7.1 1.1.8.9 1.4-.1.7-.8 1.1-1.5.9-.6-.1-1-.8-.9-1.4.2-.7.8-1.1 1.5-.9Z" />
    <path d="M16.5 17.5c.6 0 1 .5 1 1.1s-.5 1-1.1 1-1-.5-1-1.1.5-1 1.1-1Z" />
  </svg>
));

export const CONDITION_ICON_OVERRIDES: Partial<Record<WeatherCondition, LucideIcon>> = {
  muddy: MuddyIcon,
};
