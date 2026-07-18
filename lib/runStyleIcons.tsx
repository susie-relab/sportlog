// Hand-drawn line-art icons for each Run Style (RUN_TYPE_TERRAIN) — same 24x24 stroke-based
// visual language as companionIcons.tsx/subtypeIcons.tsx. Each is rendered in its run type's
// own colour (see RUN_TYPE_COLORS in types/index.ts), replacing the plain colour dot.
import type { LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import type { RunType } from '@/types';

type IconProps = { size?: number; className?: string; style?: CSSProperties };

function Svg({ size = 24, className, style, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style}
    >
      {children}
    </svg>
  );
}

function makeIcon(render: (props: IconProps) => ReactNode): LucideIcon {
  return ((props: IconProps) => render(props)) as unknown as LucideIcon;
}

// A deck/belt with a front upright rising to a console handlebar, viewed from the side —
// clearer as a treadmill silhouette than a bare diagonal line with a small foot mark.
const TreadmillIcon = makeIcon(({ size, className, style }) => (
  <Svg size={size} className={className} style={style}>
    <rect x="2" y="16" width="14" height="3" rx="1.5" />
    <path d="M13.5 16v-3.2a2 2 0 0 1 2-2h1" />
    <path d="M16.5 10.8v-4" />
    <path d="M14.3 6.8h4.4" />
    <path d="M5 19v2M10 19v2" />
  </Svg>
));

const TrailIcon = makeIcon(({ size, className, style }) => (
  <Svg size={size} className={className} style={style}>
    <path d="M3 20c3-1 4-4 7-4s4 3 7 4" />
    <path d="M14 6l3 5h-6l3-5Z" />
    <path d="M14 11v3" />
  </Svg>
));

const PushBuggyIcon = makeIcon(({ size, className, style }) => (
  <Svg size={size} className={className} style={style}>
    <circle cx="7.5" cy="18.5" r="3" />
    <circle cx="19" cy="18.5" r="1.8" />
    <path d="M7.5 15.5V8.5a5 5 0 0 1 5 5v2" />
    <path d="M12.5 15.5H19" />
    <path d="M19 15.5v3" />
    <path d="M7.5 8.5L3.5 6.5" />
  </Svg>
));

const BeachIcon = makeIcon(({ size, className, style }) => (
  <Svg size={size} className={className} style={style}>
    <circle cx="17" cy="6" r="2.5" />
    <path d="M3 20c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" />
    <path d="M3 16c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" />
  </Svg>
));

const SuburbanIcon = makeIcon(({ size, className, style }) => (
  <Svg size={size} className={className} style={style}>
    <path d="M4 20V13l4-3 4 3v7" />
    <path d="M4 13l4-3 4 3" />
    <path d="M6 20v-3h4v3" />
    <path d="M14 20V15l3-2 3 2v5" />
    <path d="M4 20h16" />
  </Svg>
));

const UrbanIcon = makeIcon(({ size, className, style }) => (
  <Svg size={size} className={className} style={style}>
    <path d="M4 20V8l5-3v15" />
    <path d="M13 20V11l6-2v11" />
    <path d="M4 20h16" />
    <path d="M7 11h1M7 14h1M16 12h1M16 15h1" />
  </Svg>
));

const RoadIcon = makeIcon(({ size, className, style }) => (
  <Svg size={size} className={className} style={style}>
    <path d="M9 4 5 20" />
    <path d="M15 4l4 16" />
    <path d="M12 6v2M12 11v2M12 16v2" />
  </Svg>
));

const TrackIcon = makeIcon(({ size, className, style }) => (
  <Svg size={size} className={className} style={style}>
    <ellipse cx="12" cy="12" rx="9" ry="6" />
    <ellipse cx="12" cy="12" rx="4.5" ry="2.5" />
  </Svg>
));

const CrossCountryIcon = makeIcon(({ size, className, style }) => (
  <Svg size={size} className={className} style={style}>
    <path d="M3 17l4-6 3 4 3-8 4 6 4-3" />
  </Svg>
));

const MountainIcon = makeIcon(({ size, className, style }) => (
  <Svg size={size} className={className} style={style}>
    <path d="M3 19l6-11 4 6 2-3 6 8Z" />
    <path d="M9 8l1.5 2" />
  </Svg>
));

export const RUN_STYLE_ICON_OVERRIDES: Partial<Record<RunType, LucideIcon>> = {
  treadmill: TreadmillIcon,
  trail: TrailIcon,
  push_buggy: PushBuggyIcon,
  beach: BeachIcon,
  urban: UrbanIcon,
  suburban: SuburbanIcon,
  road: RoadIcon,
  track: TrackIcon,
  cross_country: CrossCountryIcon,
  mountain: MountainIcon,
};
