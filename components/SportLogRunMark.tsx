/** The "Sport / Log / Run" diagonal wordmark, as live text (not a raster image) — crisp at
 *  any size, transparent background. Three words stay upright but step right+down so they
 *  overlap diagonally; the y-gap (~48-53px at the 400-wide reference size) is smaller than the
 *  font size (80px), which is what creates the overlap. To reposition a word, adjust its own
 *  x/y — no rotation involved. */
export default function SportLogRunMark({ size = 400 }: { size?: number }) {
  const wordmarkFont = "var(--font-wordmark), 'Bricolage Grotesque', sans-serif";

  return (
    <svg width={size} height={size} viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <text x="128" y="165" textAnchor="middle" fontFamily={wordmarkFont} fontSize="80" fontWeight="700" fill="#3B82F6">Sport</text>
      <text x="192" y="213" textAnchor="middle" fontFamily={wordmarkFont} fontSize="80" fontWeight="700" fill="#93C5FD" opacity="0.93">Log</text>
      <text x="232" y="266" textAnchor="middle" fontFamily={wordmarkFont} fontSize="80" fontWeight="700" fill="#00CED1" opacity="0.93">Run</text>

      {/* smiley */}
      <g transform="translate(348 86)">
        <circle cx="-9" cy="-7" r="3.6" fill="#3B82F6" />
        <circle cx="9" cy="-7" r="3.6" fill="#3B82F6" />
        <path d="M -12 5 Q 0 17 12 5" fill="none" stroke="#3B82F6" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );
}
