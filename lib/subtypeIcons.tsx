// Hand-drawn line-art icons for every subtype that gets a distinctive emoji override
// (see SUBTYPE_EMOJI_OVERRIDES in types/index.ts) — used wherever a subtype needs a more
// specific doodle than its parent exercise type's shared icon (EXERCISE_TYPE_ICONS in
// shareIcons.ts). Same visual language as lucide-react: 24x24, stroke-based, round caps.
// Each icon is built from `makeIcon`, typed (via cast) as LucideIcon so it's interchangeable
// with the real lucide icons at call sites that pick between the two.
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type IconProps = { size?: number; className?: string };

function Svg({ size = 24, className, strokeWidth = 2, children }: IconProps & { strokeWidth?: number; children: ReactNode }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

function makeIcon(render: (props: IconProps) => ReactNode): LucideIcon {
  return ((props: IconProps) => render(props)) as unknown as LucideIcon;
}

// --- Sport subtypes ---

const HockeyIcon = makeIcon(({ size, className }) => (
  // Stick + flat foot + ball — originally Golf's doodle, reused here (a hockey stick reads
  // the same way: long shaft, angled blade at the bottom, puck/ball beside it).
  <Svg size={size} className={className}>
    <path d="M11 2 6 18" />
    <path d="M6 18 1 18" />
    <circle cx="17" cy="19" r="2.2" fill="currentColor" stroke="none" />
  </Svg>
));

const GolfIcon = makeIcon(({ size, className }) => (
  // Flagstick + pennant, with the ball resting beside it.
  <Svg size={size} className={className}>
    <path d="M6 21V3" />
    <path d="M6 3 14 6.5 6 10Z" fill="currentColor" stroke="none" />
    <circle cx="17" cy="20" r="2.2" fill="currentColor" stroke="none" />
  </Svg>
));

const FootballIcon = makeIcon(({ size, className }) => (
  // Soccer ball: circle outline, a centre pentagon, and seam lines running out to the edge.
  <Svg size={size} className={className} strokeWidth={1.5}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7 15.5 9.5 14 13.5 10 13.5 8.5 9.5Z" />
    <path d="M12 7V3.5" />
    <path d="M15.5 9.5 19 8" />
    <path d="M14 13.5 16.5 17.5" />
    <path d="M10 13.5 7.5 17.5" />
    <path d="M8.5 9.5 5 8" />
  </Svg>
));

const TennisIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <ellipse cx="9" cy="8" rx="5" ry="6.5" />
    <path d="M9 14.5V21" />
    <circle cx="18" cy="18" r="2" fill="currentColor" stroke="none" />
  </Svg>
));

// A netball hoop (open ring on a net, no backboard) with the ball arriving from above —
// distinguishes it from Basketball's backboard+hoop and Volleyball's seamed ball.
const NetballIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <ellipse cx="9" cy="9" rx="6" ry="2" />
    <path d="M3.5 9c0 3 1 7 2.5 10M14.5 9c0 3-1 7-2.5 10" />
    <path d="M5 11.5l2.5 6.5M7 10.5l2 7.5M9 10l1 8M11 10.5l-1 7.5M13 11.5l-2.5 6.5" />
    <circle cx="17" cy="5" r="4" />
  </Svg>
));

// The ball's classic seamed panels — moved here from Netball so Volleyball gets the more
// recognisable "ball" glyph and Netball gets its own hoop-and-net glyph instead.
const VolleyballIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3a9 9 0 0 0-6.36 15.36" />
    <path d="M12 3a9 9 0 0 1 6.36 15.36" />
    <path d="M4.5 8.5a9 9 0 0 0 0 7" />
    <path d="M19.5 8.5a9 9 0 0 1 0 7" />
    <path d="M8 20.5a9 9 0 0 0 8 0" />
  </Svg>
));

const TurboTouchIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <ellipse cx="9" cy="12" rx="7" ry="4.5" transform="rotate(-20 9 12)" />
    <path d="M4 10.5 14 13.5" />
    <path d="M17 9 21 8" />
    <path d="M17 12 21 12" />
    <path d="M17 15 21 16" />
  </Svg>
));

// Two small paddle-shaped racquets crossing each other, rather than one racquet + ball —
// reads more clearly as "padel" (a doubles game played with two solid paddles).
const PadelIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <g transform="rotate(-25 12 12)">
      <rect x="7" y="2.5" width="7" height="9" rx="3.5" />
      <path d="M10.5 11.5v6.5" />
    </g>
    <g transform="rotate(25 12 12)">
      <rect x="10" y="2.5" width="7" height="9" rx="3.5" />
      <path d="M13.5 11.5v6.5" />
    </g>
  </Svg>
));

// A running figure carrying the ball under one arm, per the reference photo, instead of the
// generic ball-with-motion-lines glyph shared by other touch/oval-ball sports.
const TouchRugbyIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <circle cx="14" cy="4" r="2" fill="currentColor" stroke="none" />
    <path d="M14 6v5.5" />
    <path d="M14 8l-4.5 2" />
    <path d="M14 8l3 1.5-1 2" />
    <path d="M14 11.5l-4 8" />
    <path d="M14 11.5l3.5 7" />
    <ellipse cx="8.5" cy="11.5" rx="2.4" ry="1.5" transform="rotate(-25 8.5 11.5)" fill="currentColor" stroke="none" />
  </Svg>
));

const BasketballIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3v18" />
    <path d="M5.5 5.5C9 9 9 15 5.5 18.5" />
    <path d="M18.5 5.5C15 9 15 15 18.5 18.5" />
  </Svg>
));

// Three stumps with bails on top, next to the ball — no bat, since a bowled-out wicket reads
// more distinctly as "cricket" than a bat silhouette shared with other bat-and-ball sports.
const CricketIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M6 20V9" />
    <path d="M10 20V9" />
    <path d="M14 20V9" />
    <path d="M6 9h4M10 9h4" />
    <circle cx="19.5" cy="16" r="2" fill="currentColor" stroke="none" />
  </Svg>
));

// A proper shuttlecock: rounded cork base with the feather skirt fanning out to a wider rim,
// instead of a plain flat-sided triangle.
const BadmintonIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <circle cx="12" cy="4.5" r="2" fill="currentColor" stroke="none" />
    <path d="M12 6.5 6 16" />
    <path d="M12 6.5 9 17" />
    <path d="M12 6.5 12 17.5" />
    <path d="M12 6.5 15 17" />
    <path d="M12 6.5 18 16" />
    <path d="M6 16h12" />
  </Svg>
));

// A dynamic swoosh-seam ball emblem (per reference logo) instead of a plain oval with a
// straight lace line across it.
const RugbyIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <ellipse cx="12" cy="12" rx="9" ry="5" transform="rotate(-25 12 12)" />
    <path d="M6 8c3 1.5 10 8 13 9" />
    <path d="M6 8c1 2.5 2.2 4.3 4 6" />
  </Svg>
));

// A disc with an inner rim plus a couple of upward motion-trail swooshes, per the reference —
// reads as a disc actively in flight rather than sitting flat.
const FrisbeeIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <ellipse cx="14" cy="15" rx="7" ry="3.2" />
    <ellipse cx="14" cy="15" rx="3.3" ry="1.5" />
    <path d="M9.5 10.5c-2-2-2.8-4.2-1.8-6.2" />
    <path d="M6.5 12.5c-2.3-2-3.2-4.4-2.2-6.8" />
  </Svg>
));

// The table (with net) instead of a bat+ball — every other racquet sport here already gets
// its own racquet glyph, so the table is the more distinctive choice for "table tennis".
const TableTennisIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <rect x="3" y="9" width="18" height="7" rx="1" />
    <path d="M12 9v7" />
    <path d="M6 16v3" />
    <path d="M18 16v3" />
  </Svg>
));

// --- Gym Workout subtypes ---

const HiitWorkoutIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M13 2 4 14h6l-1 8 9-12h-6Z" />
  </Svg>
));

const StrengthIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M2 12h20" />
    <rect x="4" y="8" width="3" height="8" rx="1" />
    <rect x="17" y="8" width="3" height="8" rx="1" />
    <rect x="9" y="10" width="2" height="4" />
    <rect x="13" y="10" width="2" height="4" />
  </Svg>
));

const ConditioningIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 13V8" />
    <path d="M9 2h6" />
    <path d="M12 2v2" />
  </Svg>
));

const CrossfitIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <circle cx="12" cy="16" r="6" />
    <path d="M9 10V8a3 3 0 0 1 6 0v2" />
  </Svg>
));

const HyroxIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M7 4h10v4a5 5 0 0 1-10 0Z" />
    <path d="M7 5H4a3 3 0 0 0 3 5" />
    <path d="M17 5h3a3 3 0 0 1-3 5" />
    <path d="M12 13v4" />
    <path d="M9 21h6" />
    <path d="M9 21c0-2 1-3 3-3s3 1 3 3" />
  </Svg>
));

const ArmsIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M6 20c-2-4-2-9 1-12 2-2 5-2 6 0 1 2 0 4-2 5 3 0 5 2 5 5 0 2-1 4-3 4" />
  </Svg>
));

const LegsIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M10 3h4l1 8-2 10h-3l-1-7-2 7H4l3-11Z" />
  </Svg>
));

const BackShouldersIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M4 20c0-6 3-9 8-9s8 3 8 9" />
  </Svg>
));

const CoreIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <rect x="7" y="4" width="10" height="16" rx="3" />
    <path d="M7 9h10" />
    <path d="M7 14h10" />
    <path d="M12 4v16" />
  </Svg>
));

const RowIndoorIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M2 20h20" />
    <rect x="9" y="16" width="4" height="3" rx="1" />
    <path d="M13 17 20 6" />
    <path d="M18 8h4" />
  </Svg>
));

const StairClimberIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M3 21v-4h4v-4h4v-4h4v-4h4V3" />
  </Svg>
));

const SkiErgIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M5 21 15 3" />
    <path d="M9 21 19 3" />
    <circle cx="6.5" cy="16" r="1.3" />
    <circle cx="16.5" cy="16" r="1.3" />
  </Svg>
));

// --- Fitness Training subtypes ---

const BoxingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M6 12V8a2 2 0 0 1 4 0v3" />
    <path d="M10 11V6a2 2 0 0 1 4 0v5" />
    <path d="M14 11V7a2 2 0 0 1 4 0v6a5 5 0 0 1-5 5H9a4 4 0 0 1-4-4v-2a2 2 0 0 1 2-2Z" />
  </Svg>
));

const JumpRopeIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M5 5v6a7 7 0 0 0 14 0V5" />
    <rect x="3" y="3" width="3" height="4" rx="1" />
    <rect x="18" y="3" width="3" height="4" rx="1" />
  </Svg>
));

const DanceIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <circle cx="12" cy="4" r="2" />
    <path d="M12 6v7" />
    <path d="M12 8 7 5" />
    <path d="M12 8l6-2" />
    <path d="M12 13 8 21" />
    <path d="M12 13l6 5" />
  </Svg>
));

const SkateboardIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M3 12c1-2 4-3 9-3s8 1 9 3" />
    <circle cx="7" cy="15" r="1.8" fill="currentColor" stroke="none" />
    <circle cx="17" cy="15" r="1.8" fill="currentColor" stroke="none" />
  </Svg>
));

const RockClimbingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M6 14c-2 0-3-2-2-4s4-3 6-1 5 6 9 4" />
    <path d="M9 14 7 21" />
    <path d="M15 12 16 21" />
  </Svg>
));

const TrampolineIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <ellipse cx="12" cy="17" rx="9" ry="3" />
    <path d="M4 17v-2" />
    <path d="M20 17v-2" />
    <path d="M9 10 12 4 15 10" />
  </Svg>
));

const MartialArtsIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M4 12h16" />
    <path d="M8 8v8" />
    <path d="M16 8v8" />
  </Svg>
));

const CleaningIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M14 3 6 21" />
    <path d="M4 21h6l2-6H6Z" />
  </Svg>
));

const GymnasticsIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <circle cx="12" cy="20" r="2" />
    <path d="M12 18V11" />
    <path d="M12 11 6 8" />
    <path d="M12 11l6-3" />
    <path d="M8 5h8" />
  </Svg>
));

const CalisthenicsIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M3 4h18" />
    <circle cx="12" cy="8" r="2" />
    <path d="M9 4 12 10" />
    <path d="M15 4 12 10" />
    <path d="M12 10v6" />
    <path d="M9 20l3-4 3 4" />
  </Svg>
));

const SandboardingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M2 18c4-8 16-8 20 0" />
    <path d="M7 14 17 10" />
  </Svg>
));

const UnicyclingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <circle cx="12" cy="15" r="6" />
    <path d="M12 9V4" />
    <path d="M9 4h6" />
  </Svg>
));

const ArcheryIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M6 3a14 14 0 0 0 0 18" />
    <path d="M6 12h15" />
    <path d="M18 9l3 3-3 3" />
  </Svg>
));

const SlackLiningIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <rect x="2" y="14" width="3" height="7" />
    <rect x="19" y="14" width="3" height="7" />
    <path d="M5 17h14" />
    <circle cx="12" cy="12" r="2" />
    <path d="M12 14v2" />
  </Svg>
));

const RollerskateIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M4 17h10l4-3h2v3H4Z" />
    <circle cx="7" cy="19" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="17" cy="19" r="1.5" fill="currentColor" stroke="none" />
  </Svg>
));

const AbseilingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M3 21 12 3 21 21Z" />
    <path d="M12 3v18" />
    <circle cx="12" cy="14" r="1.5" fill="currentColor" stroke="none" />
  </Svg>
));

const AthleticsIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M3 6c6-3 12-3 18 0" />
    <path d="M3 12c6-3 12-3 18 0" />
    <path d="M3 18c6-3 12-3 18 0" />
  </Svg>
));

// --- Water subtypes ---

const KayakIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <ellipse cx="12" cy="14" rx="9" ry="3" />
    <path d="M6 4 18 16" />
    <path d="M5 3 7 5" />
    <path d="M17 15 19 17" />
  </Svg>
));

const SailingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M12 3v16" />
    <path d="M12 4 12 15 5 15Z" />
    <path d="M3 19c3 2 15 2 18 0" />
  </Svg>
));

const SurfIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M2 16c4-6 8-6 10-2 2-6 6-8 10-4" />
    <path d="M9 20 15 8" />
  </Svg>
));

const RowingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M2 18c4-3 16-3 20 0" />
    <path d="M4 5 20 19" />
  </Svg>
));

const WakaAmaIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <ellipse cx="10" cy="14" rx="8" ry="2.5" />
    <path d="M14 12 20 10" />
    <path d="M14 16 20 18" />
    <ellipse cx="20" cy="14" rx="2.5" ry="1.5" />
  </Svg>
));

const SupIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M2 17c4-2 16-2 20 0" />
    <path d="M12 17V3" />
    <path d="M9 3h6" />
  </Svg>
));

const BodyBoardingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M3 15c3-5 15-5 18 0" />
    <rect x="8" y="13" width="8" height="5" rx="2.5" transform="rotate(-15 8 13)" />
  </Svg>
));

const WindsurfingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M3 19h18" />
    <path d="M12 19V6" />
    <path d="M12 6 19 15 12 15Z" />
  </Svg>
));

const KitesurfingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M12 2 17 7 12 12 7 7Z" />
    <path d="M12 12 9 20" />
    <path d="M5 20h8" />
  </Svg>
));

const WakeboardingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M2 19c3-4 17-4 20 0" />
    <rect x="7" y="17" width="10" height="3" rx="1.5" />
    <path d="M14 17 22 6" />
  </Svg>
));

const WaterskiingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M4 20 9 8" />
    <path d="M11 20 16 8" />
    <path d="M16 8 22 3" />
    <path d="M20 2h3v3" />
  </Svg>
));

const DivingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M5 10a7 4 0 0 1 14 0v3a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z" />
    <circle cx="9" cy="11" r="1.5" />
    <circle cx="15" cy="11" r="1.5" />
    <path d="M18 8c2-1 3-3 2-5" />
  </Svg>
));

const SpearFishingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M3 21 19 5" />
    <path d="M19 5 22 2" />
    <path d="M19 5 21 8" />
    <path d="M4 15c2-2 5-2 6 0-1 2-4 2-6 0Z" />
    <path d="M4 15 2 13" />
    <path d="M4 15 2 17" />
  </Svg>
));

const FishingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M3 21 18 4" />
    <path d="M18 4 20 16" />
    <path d="M20 16a2 2 0 1 0 0.5 2" />
  </Svg>
));

const CanyoningIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M2 21 8 3" />
    <path d="M22 21 16 3" />
    <path d="M12 3v18" />
  </Svg>
));

const CoasteeringIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M2 14 6 8 10 12 14 5 18 10 22 14" />
    <path d="M2 19c5-2 15-2 20 0" />
  </Svg>
));

const RaftingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M3 15a9 4 0 0 0 18 0" />
    <path d="M3 15a9 3 0 0 1 18 0" />
    <path d="M12 15 18 6" />
  </Svg>
));

// --- Snow subtypes ---

const SnowboardIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <rect x="4" y="10" width="16" height="4" rx="2" transform="rotate(-20 12 12)" />
  </Svg>
));

const SkiingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M5 21 8 3" />
    <path d="M14 21 17 3" />
    <path d="M20 3 16 15" />
  </Svg>
));

const SleddingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M3 18h14" />
    <path d="M5 18c0-2 1-3 2-3h8c1 0 2 1 2 3" />
    <path d="M5 18 3 21" />
    <path d="M19 18 21 21" />
  </Svg>
));

const SkatingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M4 15h9v4H7a3 3 0 0 1-3-3Z" />
    <path d="M4 19h14" />
    <path d="M13 11V15" />
  </Svg>
));

// --- Swim subtypes ---

const PoolIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M2 7h20" />
    <path d="M2 12h20" />
    <path d="M2 17h20" />
  </Svg>
));

const WaterJoggingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M9 3v8" />
    <path d="M15 3v6" />
    <path d="M2 17c3-2 6-2 9 0s6 2 9 0" />
  </Svg>
));

const AquaAerobicsIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M2 17c3-2 6-2 9 0s6 2 9 0" />
    <path d="M7 9h10" />
    <rect x="5" y="6" width="3" height="6" rx="1" />
    <rect x="14" y="6" width="3" height="6" rx="1" />
  </Svg>
));

// --- Shared (used across more than one exercise type) ---

const BeachIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M4 20c4-6 12-6 16 0" />
    <ellipse cx="9" cy="10" rx="1.5" ry="2.5" transform="rotate(-10 9 10)" />
    <ellipse cx="12" cy="7" rx="1" ry="1.6" transform="rotate(-10 12 7)" />
  </Svg>
));

export const SUBTYPE_ICON_OVERRIDES: Record<string, LucideIcon> = {
  pool: PoolIcon,
  snowboard: SnowboardIcon,
  skiing: SkiingIcon,
  beach: BeachIcon,
  football: FootballIcon,
  tennis: TennisIcon,
  netball: NetballIcon,
  volleyball: VolleyballIcon,
  golf: GolfIcon,
  turbo_touch: TurboTouchIcon,
  padel: PadelIcon,
  touch_rugby: TouchRugbyIcon,
  basketball: BasketballIcon,
  cricket: CricketIcon,
  badminton: BadmintonIcon,
  rugby: RugbyIcon,
  hockey: HockeyIcon,
  frisbee: FrisbeeIcon,
  table_tennis: TableTennisIcon,
  hiit_workout: HiitWorkoutIcon,
  strength: StrengthIcon,
  conditioning: ConditioningIcon,
  crossfit: CrossfitIcon,
  hyrox: HyroxIcon,
  arms: ArmsIcon,
  legs: LegsIcon,
  back_shoulders: BackShouldersIcon,
  core: CoreIcon,
  row_indoor: RowIndoorIcon,
  stair_climber: StairClimberIcon,
  ski_erg: SkiErgIcon,
  boxing: BoxingIcon,
  jump_rope: JumpRopeIcon,
  dance: DanceIcon,
  skateboard: SkateboardIcon,
  rock_climbing: RockClimbingIcon,
  trampoline: TrampolineIcon,
  martial_arts: MartialArtsIcon,
  cleaning: CleaningIcon,
  kayak: KayakIcon,
  sailing: SailingIcon,
  surf: SurfIcon,
  rowing: RowingIcon,
  waka_ama: WakaAmaIcon,
  sup: SupIcon,
  body_boarding: BodyBoardingIcon,
  windsurfing: WindsurfingIcon,
  kitesurfing: KitesurfingIcon,
  wakeboarding: WakeboardingIcon,
  waterskiing: WaterskiingIcon,
  diving: DivingIcon,
  spear_fishing: SpearFishingIcon,
  fishing: FishingIcon,
  canyoning: CanyoningIcon,
  coasteering: CoasteeringIcon,
  rafting: RaftingIcon,
  sledding: SleddingIcon,
  skating: SkatingIcon,
  water_jogging: WaterJoggingIcon,
  aqua_aerobics: AquaAerobicsIcon,
  gymnastics: GymnasticsIcon,
  calisthenics: CalisthenicsIcon,
  sandboarding: SandboardingIcon,
  unicycling: UnicyclingIcon,
  archery: ArcheryIcon,
  slack_lining: SlackLiningIcon,
  rollerskate: RollerskateIcon,
  abseiling: AbseilingIcon,
  athletics: AthleticsIcon,
};
