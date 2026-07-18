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
    <path d="M6.3 2.3v11.4M9 1.7v12.6M11.7 2.3v11.4" strokeWidth={0.6} />
    <path d="M4.7 4.7h8.6M4.2 8h9.6M4.7 11.3h8.6" strokeWidth={0.6} />
  </Svg>
));

// A netball hoop (open ring on a net, no backboard) with the ball arriving from above —
// distinguishes it from Basketball's backboard+hoop and Volleyball's seamed ball.
// A diamond-mesh net (thin zigzag rows, not the earlier single-direction "fringe" lines
// that just fanned toward one point) hanging from the hoop.
const NetballIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <ellipse cx="9" cy="9" rx="6" ry="2" />
    <path d="M3.5 9c0 3 1 7 2.5 10M14.5 9c0 3-1 7-2.5 10" />
    <path d="M4.3 11.3 5.7 12.7 7.1 11.3 8.5 12.7 9.9 11.3 11.3 12.7 12.7 11.3" strokeWidth={0.5} />
    <path d="M5 14.6 6.3 15.9 7.6 14.6 8.9 15.9 10.2 14.6 11.5 15.9 12.8 14.6" strokeWidth={0.5} />
    <path d="M5.9 17.7 7 18.8 8.1 17.7 9.2 18.8 10.3 17.7 11.4 18.8" strokeWidth={0.5} />
    <circle cx="17" cy="5" r="4" />
  </Svg>
));

// The ball's classic seamed panels — moved here from Netball so Volleyball gets the more
// recognisable "ball" glyph and Netball gets its own hoop-and-net glyph instead.
// Three curved panel seams all converging near the right edge and fanning out across the
// ball, plus a short seam curling up to the top — matches the classic volleyball glyph.
// The classic 3-panel pinwheel seam pattern (a top "cone" plus one long diagonal sweep),
// matching the reference more closely than the earlier converging-fan version.
// Three curved seams, each running from one side of the ball to the other without
// touching the other two — a cleaner read than the earlier converging pattern.
// Three vertical seams, each spanning the ball's full height at its own x-position,
// evenly spaced 5 units apart (7, 12, 17) — computed to touch the circle's own boundary
// top and bottom rather than an arbitrary curve.
// Middle seam stays a straight vertical; the two outer seams curve slightly, and three
// short connector lines per side tie each outer seam to the ball's own edge.
const VolleyballIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M7 4.5Q8.5 12 7 19.5" />
    <path d="M12 3V21" />
    <path d="M17 4.5Q15.5 12 17 19.5" />
    <path d="M6.6 10H4.3" strokeWidth={1.1} />
    <path d="M6.6 14H4.3" strokeWidth={1.1} />
    <path d="M17.4 10H19.7" strokeWidth={1.1} />
    <path d="M17.4 14H19.7" strokeWidth={1.1} />
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
// Both heads centred on the crossing point with the handles extending outward past them,
// rather than handles that pass through the centre toward the opposite racquet.
// A wider crossing angle separates the two heads more clearly than a near-overlap, and a
// small ball at the centre reads as the third reference element without adding clutter.
// A single solid-filled paddle instead of two crossed outlines — simpler and reads more
// clearly as "padel" (its solid paddle is what sets it apart from a strung racquet sport).
// A rounded perforated paddle head + throat + grip, plus a ball beside it — closer to a
// real padel racquet's shape than a plain filled rounded rect, per reference.
// The racquet sits on a diagonal (like it would in an action shot), with a single-line
// handle instead of a hollow grip rect and connector — plus a ball beside it.
const PadelIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <g transform="rotate(-25 11 11)">
      <path d="M9.5 2.3C6.3 2.9 4 6 4 9.7c0 3.6 2.8 5.8 6.5 5.8s6.5-2.2 6.5-5.8c0-3.7-2.3-6.8-5.5-7.4a4 4 0 0 0-2 0Z" />
      <circle cx="7.6" cy="7.4" r="0.55" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="6" r="0.55" fill="currentColor" stroke="none" />
      <circle cx="13.4" cy="7.4" r="0.55" fill="currentColor" stroke="none" />
      <circle cx="7" cy="10.3" r="0.55" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="9.2" r="0.55" fill="currentColor" stroke="none" />
      <circle cx="14" cy="10.3" r="0.55" fill="currentColor" stroke="none" />
      <circle cx="8.3" cy="13" r="0.55" fill="currentColor" stroke="none" />
      <circle cx="12.7" cy="13" r="0.55" fill="currentColor" stroke="none" />
      <path d="M10.5 15.5v6" />
    </g>
    <circle cx="19.5" cy="18" r="2.3" />
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
// Cork base plus four fanning feather spines, each with a short cross-stroke near the tip
// suggesting the feather's blade width/overlap — closer to the reference than plain rays.
// Each feather spine now ends in a small angled point (a tiny "V" cap) instead of a plain
// round stroke-end, which read as a flat/cut-off tip rather than a tapered feather.
// The cork is now a filled ellipse (the previous stroked arc rendered too faintly to read
// as a rounded base), and the whole shuttlecock is scaled down slightly so all four feather
// tips and the cork clear the viewBox with margin instead of crowding its edges.
// A simple cone/skirt shape (flaring wide at the feather rim, narrowing to a point at the
// cork) with a couple of seam lines and a solid cork tip — a much more recognisable
// A fan of individually-rounded feather petals (per reference), tilted diagonally, with a
// hollow cork at the base — all thin strokes.
const FEATHER_PETAL = "M12 5c-1.4 0-2.4 1.3-2.1 3l1.4 9.5c.1.9.6 1.3 1.1 1.3s1-.4 1.1-1.3l1.1-9.5c.3-1.7-.7-3-2.1-3Z";

const BadmintonIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <g transform="rotate(35 12 12)" strokeWidth={1.2}>
      {[-21, -7, 7, 21].map(a => (
        <path key={a} d={FEATHER_PETAL} transform={`rotate(${a} 12 19)`} />
      ))}
      <circle cx="12" cy="19.3" r="2.1" />
    </g>
  </Svg>
));

// A dynamic swoosh-seam ball emblem (per reference logo) instead of a plain oval with a
// straight lace line across it.
// A tilted oval ball with two close-together seam curves running its length, per the
// reference — instead of a single centred lace line.
const RugbyIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <g transform="rotate(-35 12 12)">
      <ellipse cx="12" cy="12" rx="9" ry="5" />
      <path d="M4 10c3-3 13-3 16 0" />
      <path d="M4 12.5c3-3 13-3 16 0" />
    </g>
  </Svg>
));

// A disc with an inner rim plus a couple of upward motion-trail swooshes, per the reference —
// reads as a disc actively in flight rather than sitting flat.
const FrisbeeIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <ellipse cx="14" cy="15" rx="7" ry="3.2" />
    <ellipse cx="14" cy="15" rx="3.3" ry="1.5" />
    <path d="M9 9c-2-2-2.8-4.2-1.8-6.2" />
    <path d="M6 10.5c-2.3-2-3.2-4.4-2.2-6.8" />
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

// A front-on figure double-bicep flexing — head, shoulders, both arms bent up with a
// defined bicep bulge on each side, fists near the shoulders, per reference (no face).
const ArmsIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <circle cx="12" cy="4.3" r="2" />
    <path d="M7.3 9.3c1.3-2 2.9-3 4.7-3s3.4 1 4.7 3" />
    <path d="M7.3 9.3c-2.8 0-4.8-1.5-4.6-3.7" />
    <circle cx="2.5" cy="5.2" r="1.4" fill="currentColor" stroke="none" />
    <path d="M16.7 9.3c2.8 0 4.8-1.5 4.6-3.7" />
    <circle cx="21.5" cy="5.2" r="1.4" fill="currentColor" stroke="none" />
    <path d="M12 6.3v9.5" />
  </Svg>
));

// A mid-stride running-leg silhouette (chunky rounded strokes standing in for the solid
// shape), one leg driving forward bent at the knee, the other trailing back, per reference.
const LegsIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M14 4 17.5 10 15 20" strokeWidth={3} />
    <path d="M14 4 14.2 9 4.9 17.4" strokeWidth={3} />
  </Svg>
));

// Shoulder arc plus trapezius/lat curves flowing down to the sides and a spine down the
// centre, instead of a single bare arc — reads as a back, not just a rounded line.
const BackShouldersIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M4 9c0-3 3.5-6 8-6s8 3 8 6" />
    <path d="M4 9c-1 4 0 8 2 11" />
    <path d="M20 9c1 4 0 8-2 11" />
    <path d="M12 3v18" />
    <circle cx="6" cy="20" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="18" cy="20" r="1.3" fill="currentColor" stroke="none" />
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

// A seated rower mid-pull — head, bent-forward torso/legs, and the arm reaching to the
// handle — plus the machine's floor rail, per reference, instead of an abstract
// rail+seat+flywheel diagram.
const RowIndoorIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <circle cx="7" cy="4" r="2" fill="currentColor" stroke="none" />
    <path d="M7 6v3.5" />
    <path d="M7 9.5c-2 1-3.2 2.8-3.2 5" />
    <path d="M7 9.5c1.8.2 3.3 1.2 4.6 2.6" />
    <path d="M11.6 12.1 19 12.1" strokeWidth={1} />
    <path d="M19 19.5v-9.5" />
    <path d="M4 15h9" />
    <path d="M2 19.5h20" />
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

// A solid boxing-glove silhouette on a diagonal, per reference, instead of a bare
// three-finger outline.
const BoxingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <g transform="rotate(8 12 12)">
      <path d="M13 2C16 2 18 4.5 18 7.5L17.5 17H8C6 17 4.3 15.5 4.3 13C4.3 10.8 5.5 9.3 7.3 9C7.6 7 8.5 4.5 10.5 3C11.2 2.5 12 2 13 2Z" fill="#94A3B8" stroke="currentColor" />
      <rect x="6" y="17" width="10" height="4" rx="1.3" fill="#94A3B8" stroke="currentColor" />
      <path d="M7.3 9c.3 2.5 1 5.5 1 8" strokeWidth={1} fill="none" />
      <path d="M6.3 18.6h9.4" strokeWidth={1} fill="none" />
      <path d="M8 10c3 2 6.5 2 8.5 0" strokeWidth={1} fill="none" />
    </g>
  </Svg>
));

// Two handles at the bottom with the rope rising and crossing into a teardrop-shaped loop,
// per reference — reads as a rope mid-swing rather than a plain arc between two handles.
// Two offset handles, each with a grip band and rivet dot, joined by one simple scooping
// rope curve — per reference, instead of a crossed teardrop loop between two level handles.
// A person mid-jump (head sitting directly on the shoulders, no gap) holding the rope,
// with the rope itself drawn as a much thinner line than the body — per reference, instead
// of two disembodied handles joined by a body-thickness rope.
const JumpRopeIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <circle cx="12" cy="4" r="2" fill="currentColor" stroke="none" />
    <path d="M12 6v6" />
    <path d="M12 7.5 7.5 9.5" />
    <path d="M12 7.5 16.5 9.5" />
    <path d="M12 12 11 20" />
    <path d="M12 12 16 19" />
    <path d="M7.5 9.5c-2.5 3-2.5 9 2 12s9 0 9-5c0-4-2.5-7-4.5-9" strokeWidth={0.6} />
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

// A climber clinging under a rock ledge (head, arm reaching up to the ledge, sprawled
// legs), per reference — a clearer "climbing" pose than an abstract rock-line silhouette.
const RockClimbingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M3 6c3 0 4 1 6 1s3-1 5 0 4 2 7 1" />
    <circle cx="6.5" cy="10.5" r="1.7" fill="currentColor" stroke="none" />
    <path d="M7.7 11.7 10.3 7.7" />
    <path d="M7.7 11.7 9.5 16" />
    <path d="M9.5 16 6 20" />
    <path d="M9.5 16 13.5 18.5" />
  </Svg>
));

// A person mid-jump (head + splayed arms/legs) above the trampoline mat with its centre
// hole and support legs, per reference — clearer than a bare arc over an ellipse.
const TrampolineIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <circle cx="12" cy="4" r="2" fill="currentColor" stroke="none" />
    <path d="M12 6.5 8 9" />
    <path d="M12 6.5 16 9" />
    <path d="M12 6.5 9 11" />
    <path d="M12 6.5 15 11" />
    <ellipse cx="12" cy="16" rx="8" ry="2.3" />
    <ellipse cx="12" cy="16" rx="1.3" ry="0.5" fill="currentColor" stroke="none" />
    <path d="M5 17.3v3M19 17.3v3M12 18.3v3" />
  </Svg>
));

// A high side-kick pose (head, guard arm raised, support leg down, kicking leg extended
// out to the side), per reference — instead of an abstract three-bar shape.
const MartialArtsIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <circle cx="6" cy="4" r="2" fill="currentColor" stroke="none" />
    <path d="M6.5 6 9 9" />
    <path d="M9 9 15 4.5" />
    <path d="M9 9 8 15" />
    <path d="M8 15 9 20" />
    <path d="M9 9 18 11" />
  </Svg>
));

const CleaningIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M14 3 6 21" />
    <path d="M4 21h6l2-6H6Z" />
  </Svg>
));

// A handstand: head/hands near the ground, arms out to the sides for support, legs
// splayed up and out — per reference, instead of a figure standing on a beam.
// Arms now reach the floor below the head (hands are the lowest point, head sits just
// above them), instead of the head being lower than the arms.
// A dynamic flip/cartwheel pose per reference — head low, torso on the diagonal, one short
// arm reaching to the floor near the head and one long arm flung up and out, legs splayed
// at different angles rather than a symmetric handstand.
// A symmetric handstand — clearer and more reliably legible at icon size than a fully
// asymmetric tumbling pose, which read as an ambiguous squiggle rather than a person.
// A stickman mid-cartwheel — an X/star shape with both hands touching the ground and both
// legs splayed up in the air, head clearly visible above the centre (not at the ground).
// An upside-down tumbling stickman: arms splayed up in a wide V, legs splayed down, head
// (filled circle) at the bottom, touching directly onto the legs' junction point — frozen
// mid-cartwheel, per reference.
const GymnasticsIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M12 10 2 3" />
    <path d="M12 10 21 7" />
    <path d="M12 10v5" />
    <path d="M12 15 5 21" />
    <path d="M12 15 18 18" />
    <circle cx="12" cy="17.2" r="2.2" fill="currentColor" stroke="none" />
  </Svg>
));

// Two posts with rings hanging from them, no figure — a simple obstacle-course rig marker.
const ObstacleCourseIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M5 2v11" />
    <path d="M19 2v11" />
    <circle cx="5" cy="15.3" r="2.3" />
    <circle cx="19" cy="15.3" r="2.3" />
  </Svg>
));

// A trapeze acrobat hanging by both arms from a bar, head visible between the arms, torso
// and legs dangling below.
const TrapezeIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M4 2v4" />
    <path d="M20 2v4" />
    <path d="M4 6h16" strokeWidth={1.5} />
    <path d="M7 6 12 11" />
    <path d="M17 6 12 11" />
    <path d="M12 11.2v6" />
    <path d="M12 17.2 9 22" />
    <path d="M12 17.2 15 22" />
    <circle cx="12" cy="8" r="1.5" fill="currentColor" stroke="none" />
  </Svg>
));

const CalisthenicsIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <g transform="rotate(90 12 12)">
      <path d="M3 4h18" />
      <circle cx="12" cy="11" r="1.5" />
      <path d="M8.5 4 12 12.5" />
      <path d="M15.5 4 12 12.5" />
      <path d="M12 12.5v3.5" />
      <path d="M9 20l3-4 3 4" />
    </g>
  </Svg>
));

// A normal standing stickman, both feet planted on a board with short upturned lips at
// each end, the whole scene tilted onto a diagonal to read as riding down a slope.
const SandboardingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <g transform="rotate(-18 12 14)">
      <circle cx="12" cy="5" r="2" fill="currentColor" stroke="none" />
      <path d="M12 7v6" />
      <path d="M12 9 8.5 11.5" />
      <path d="M12 9 15.5 11.5" />
      <path d="M12 13 9.5 16.5" />
      <path d="M12 13 14.5 16.5" />
      <path d="M4.5 15.5c0 1.6 1.2 2 2.3 2h10.4c1.1 0 2.3-.4 2.3-2" strokeWidth={1.2} />
    </g>
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

// A person balancing on a thin diagonal slackline — both arms up for balance, one leg
// planted forward and one lifted back behind — per reference, instead of two posts with a
// seated figure on a level line.
const SlackLiningIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <circle cx="13" cy="5" r="2" fill="currentColor" stroke="none" />
    <path d="M13 7v8" />
    <path d="M12.3 9 7.5 3.5" />
    <path d="M13.3 9 17.5 4.5" />
    <path d="M13 15 10 19.7" />
    <path d="M13 15 17.5 13" />
    <path d="M3 22 21 16" strokeWidth={1.2} />
  </Svg>
));

// A boot with laces and a sole, wheels beneath — per reference, instead of a flat wedge
// with three wheels in a row (which read more like a skateboard truck than a skate boot).
const RollerskateIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M8 4v8h8c1.5 0 2.5 1 2.5 2.5H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
    <path d="M8 7h4M8 9.5h4" />
    <path d="M4 14.5h14.5" />
    <circle cx="7" cy="17.5" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="15" cy="17.5" r="1.6" fill="currentColor" stroke="none" />
  </Svg>
));

// A person rappelling down the rope — head, gripping arm, and bent legs pushed against
// the wall — instead of an abstract mountain-with-a-rope shape.
const AbseilingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M18 2v20" />
    <circle cx="10" cy="6" r="2" fill="currentColor" stroke="none" />
    <path d="M10 8c1 2 2 3 4 3.5" />
    <path d="M14 11.5 18 9" />
    <path d="M10 8c-1 2.5-1 5-1 7" />
    <path d="M9 15 6 19" />
    <path d="M9 15l5 2" />
  </Svg>
));

// A pull-up/gymnastics rig — two posts on square feet with two horizontal bars near the
// top — per reference, instead of three stacked wavy lines.
const AthleticsIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M5 4v16" />
    <path d="M19 4v16" />
    <path d="M5 5h14" />
    <path d="M5 8h14" />
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

// A standing stickman with both feet on a flat board (no lipped ends), tilted onto the
// opposite diagonal from Sandboarding, per reference.
const SnowboardIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <g transform="rotate(18 12 14)">
      <circle cx="12" cy="5" r="2" fill="currentColor" stroke="none" />
      <path d="M12 7v6" />
      <path d="M12 9 8.5 11.5" />
      <path d="M12 9 15.5 11.5" />
      <path d="M12 13 9.5 16.5" />
      <path d="M12 13 14.5 16.5" />
      <rect x="3.5" y="15.8" width="16" height="1.6" rx="0.8" strokeWidth={0.8} />
    </g>
  </Svg>
));

// A crouched skier leaning forward, one arm/pole reaching forward, both legs bent down to
// a single diagonal ski board, per reference.
// A thin-lined crouched skier: hollow head, a long pole crossing diagonally through the
// body, an S-bent back, a hooked hand near the face, and two parallel diagonal skis, per
// reference — all strokes thin rather than the usual bold weight.
const SkiingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className} strokeWidth={1.3}>
    <circle cx="17" cy="4" r="2" />
    <path d="M7 .5 16 11.5" />
    <path d="M14.5 6.5c-1.5 1-2.5 2.3-2.3 4 .2 1.7 1.7 2 1.7 3.8 0 1.3-.5 2.6-1.4 4" />
    <path d="M13.5 8c1 .3 1.8 1 2.3 2" />
    <path d="M2 16.5 20 21" strokeWidth={0.9} />
    <path d="M3 19.5 21 23" strokeWidth={0.9} />
  </Svg>
));

// A thin-lined sled: top rail, three vertical slats, and a bottom runner that curls up at
// the front, per reference.
const SleddingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className} strokeWidth={1.3}>
    <path d="M4 9h15" />
    <path d="M7 9v6" />
    <path d="M11 9v6" />
    <path d="M15 9v6" />
    <path d="M2 15h16c2 0 3-2 3-4" />
  </Svg>
));

// An ice-skate boot outline with a heel curve, two blade-mount tabs, and a blade line
// beneath, per reference, instead of a plain rounded-rect boot.
// A simple shoe-outline silhouette sitting on the skate base (two mount tabs + blade line),
// per reference, instead of a boot with a separate ankle cuff.
// A figure-skate boot (ankle cuff, curved toe, laces) sitting on the blade base, per
// reference, instead of a plain triangular shoe outline.
const SkatingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className} strokeWidth={1}>
    <path d="M7 3v7" />
    <path d="M7 3c1.2-.9 2.3-.7 3 .4" />
    <path d="M10 3.4v3.6" />
    <path d="M10 7c3 .4 6 1.9 6 5" />
    <path d="M16 12c0 1-.7 1.8-2 1.8H6c-1.8 0-3-1-3-2.6 0-1.3.9-2.2 2-2.2" />
    <path d="M8.3 6.1 10.5 6.9" strokeWidth={0.7} />
    <path d="M8.6 7.6 10.8 8.4" strokeWidth={0.7} />
    <path d="M8.9 9.1 11.1 9.9" strokeWidth={0.7} />
    <path d="M6 15.6v1.7" />
    <path d="M13 15.6v1.7" />
    <path d="M4.5 17.8h11" strokeWidth={0.8} />
  </Svg>
));

// A walking figure with both feet on oval snowshoes.
const SnowshoeingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <circle cx="12" cy="4" r="2" fill="currentColor" stroke="none" />
    <path d="M12 6v5" />
    <path d="M12 8 9 10" />
    <path d="M12 8 15 10" />
    <path d="M12 11 9 15" />
    <path d="M12 11 15 15" />
    <ellipse cx="9" cy="17.3" rx="3" ry="1.8" />
    <ellipse cx="15" cy="17.3" rx="3" ry="1.8" />
  </Svg>
));

// A climber on a steep slope, ice axe planted overhead, per the Skiing/Sandboarding
// icons' "figure + tool + line" pattern.
const AlpineClimbingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M2 21 20 4" strokeWidth={1.2} />
    <circle cx="14" cy="9" r="2" fill="currentColor" stroke="none" />
    <path d="M14 11v4" />
    <path d="M14 12 10 10" />
    <path d="M10 10 7 6.5" strokeWidth={1} />
    <path d="M7 6.5 5.3 6" strokeWidth={1} />
    <path d="M14 12 17 14" />
    <path d="M14 15 11 19" />
    <path d="M14 15 16 19" />
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

// A stick figure's head and swinging arms above the waterline, per reference — reads
// clearly as "jogging in water" rather than two bare vertical lines.
// Both arms raised above the waterline (not just one), a clearer "jogging" silhouette.
const WaterJoggingIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <circle cx="12" cy="5" r="2" fill="currentColor" stroke="none" />
    <path d="M12 9v6" />
    <path d="M12 9 9 8" />
    <path d="M12 9 15 8" />
    <path d="M2 17c3-2 6-2 9 0s6 2 9 0" />
  </Svg>
));

// A cresting wave with a curling top, plus a calmer swell line below, per reference.
const OceanIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M2 14c2.5-1 3.5-3.5 3.5-6c0 2.8 2 4.6 4.3 4.6c1 0 1.7-.5 1.7-1.3c0 1.6 1.6 2.4 3.5 2.4c2 0 4-.9 5.5-2.2" />
    <path d="M2 18c3-1.3 6-1.3 9 0s6 1.3 9 0" />
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

// A backpack, for multi-day hikes.
// A simple crescent moon, for multi-day trips that stretch overnight.
const MultiDayIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M15 3a9 9 0 1 0 6 15.8A9 9 0 0 1 15 3Z" />
  </Svg>
));

// A relaxed walker — head, arm/leg mid-swing, no motion lines (unlike Speed below).
const StrollIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <circle cx="12" cy="4" r="2" fill="currentColor" stroke="none" />
    <path d="M12 6v6" />
    <path d="M12 8 9 10" />
    <path d="M12 9l4 1" />
    <path d="M12 12 9 20" />
    <path d="M12 12l4 7" />
  </Svg>
));

// A leaning-forward walker with motion lines trailing behind, for a brisk/speed walk.
const SpeedWalkIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <circle cx="15" cy="4" r="2" fill="currentColor" stroke="none" />
    <path d="M15 6v5" />
    <path d="M15 7l4 2" />
    <path d="M15 11 11 13" />
    <path d="M11 13 8 20" />
    <path d="M11 13l6 5" />
    <path d="M2 9h4M2 13h5M2 17h3" />
  </Svg>
));

const WalkUrbanIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M4 21V9l5-4v16" />
    <path d="M14 21V12l6-3v12" />
    <path d="M4 21h16" />
    <path d="M7 12h1M7 15h1M16 13h1M16 16h1" />
  </Svg>
));

// A fern/leafy clump, for bush walks.
const BushIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M12 21V9" />
    <path d="M12 9c-3 0-5-2-5-5 2 0 4 1 5 3 1-2 3-3 5-3 0 3-2 5-5 5Z" />
    <path d="M12 14c-2 0-3.5-1.3-3.5-3.3 1.3 0 2.7.7 3.5 2 .8-1.3 2.2-2 3.5-2 0 2-1.5 3.3-3.5 3.3Z" />
  </Svg>
));

const WalkMountainIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M3 19l6-11 4 6 2-3 6 8Z" />
    <path d="M9 8l1.5 2" />
  </Svg>
));

// A barn, for farm walks.
// Two overlapping rolling hills, per reference — a filled silhouette rather than a barn,
// which read too similarly to other building-shaped icons in this set.
const FarmIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M2 17c0-5 3.5-9 6.5-9 1.8 0 3 1 4 2.3-2.5 1.2-4.5 3.8-4.5 6.7Z" fill="currentColor" stroke="none" />
    <path d="M7.5 17c0-5 3.5-9 6.5-9s6.5 4 6.5 9Z" fill="currentColor" stroke="none" />
  </Svg>
));

const WalkRoadIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <path d="M9 4 5 20" />
    <path d="M15 4l4 16" />
    <path d="M12 6v2M12 11v2M12 16v2" />
  </Svg>
));

const TrackOvalIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <ellipse cx="12" cy="12" rx="9" ry="6" />
    <ellipse cx="12" cy="12" rx="4.5" ry="2.5" />
  </Svg>
));

const WalkTreadmillIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <rect x="2" y="16" width="14" height="3" rx="1.5" />
    <path d="M13.5 16v-3.2a2 2 0 0 1 2-2h1" />
    <path d="M16.5 10.8v-4" />
    <path d="M14.3 6.8h4.4" />
    <path d="M5 19v2M10 19v2" />
  </Svg>
));

const WalkPushBuggyIcon = makeIcon(({ size, className }) => (
  <Svg size={size} className={className}>
    <circle cx="7.5" cy="18.5" r="3" />
    <circle cx="19" cy="18.5" r="1.8" />
    <path d="M7.5 15.5V8.5a5 5 0 0 1 5 5v2" />
    <path d="M12.5 15.5H19" />
    <path d="M19 15.5v3" />
    <path d="M7.5 8.5L3.5 6.5" />
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
  snowshoeing: SnowshoeingIcon,
  alpine_climbing: AlpineClimbingIcon,
  water_jogging: WaterJoggingIcon,
  ocean: OceanIcon,
  aqua_aerobics: AquaAerobicsIcon,
  multi_day: MultiDayIcon,
  stroll: StrollIcon,
  speed: SpeedWalkIcon,
  urban: WalkUrbanIcon,
  bush: BushIcon,
  mountain: WalkMountainIcon,
  farm: FarmIcon,
  road: WalkRoadIcon,
  track_oval: TrackOvalIcon,
  treadmill: WalkTreadmillIcon,
  push_buggy: WalkPushBuggyIcon,
  gymnastics: GymnasticsIcon,
  acrobats: TrapezeIcon,
  calisthenics: CalisthenicsIcon,
  sandboarding: SandboardingIcon,
  unicycling: UnicyclingIcon,
  archery: ArcheryIcon,
  slack_lining: SlackLiningIcon,
  rollerskate: RollerskateIcon,
  abseiling: AbseilingIcon,
  athletics: AthleticsIcon,
  obstacle_course: ObstacleCourseIcon,
};
