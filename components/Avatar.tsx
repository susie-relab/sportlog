export const AVATAR_COLORS = {
  blue: '#7DD3FC',
  yellow: '#FDE047',
  orange: '#FDBA74',
  green: '#86EFAC',
  pink: '#F9A8D4',
  purple: '#C4B5FD',
} as const;

export type AvatarColorKey = keyof typeof AVATAR_COLORS;

/** Circular avatar — shows the user's uploaded photo, or a default panda (face colour
 *  configurable so different accounts/devices can be told apart at a glance). */
export default function Avatar({ url, size = 32, color, bare = false }: { url?: string | null; size?: number; color?: string | null; bare?: boolean }) {
  return (
    <span
      className={`inline-block rounded-full overflow-hidden flex-shrink-0 ${bare ? '' : 'bg-[#EAF2FF]'}`}
      style={{ width: size, height: size }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <PandaFace color={color || AVATAR_COLORS.blue} />
      )}
    </span>
  );
}

function PandaFace({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden>
      {/* ears */}
      <circle cx="25" cy="28" r="14" fill="#1E293B" />
      <circle cx="75" cy="28" r="14" fill="#1E293B" />
      {/* face */}
      <ellipse cx="50" cy="56" rx="37" ry="32" fill={color} />
      {/* eyes */}
      <circle cx="35" cy="53" r="13.5" fill="#1E293B" />
      <circle cx="65" cy="53" r="13.5" fill="#1E293B" />
      <circle cx="39" cy="53" r="1.3" fill="#fff" />
      <circle cx="61" cy="53" r="1.3" fill="#fff" />
      {/* nose */}
      <path d="M50,64 Q52,64 53,67 Q54,70 50,70 Q46,70 47,67 Q48,64 50,64 Z" fill="#1E293B" />
      {/* nose-to-mouth line + smile */}
      <path d="M50,70 L50,76 M43,73 Q50,79 57,73" stroke="#1E293B" strokeWidth="1.1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
