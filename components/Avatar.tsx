/** Circular avatar — shows the user's uploaded photo, or a default cute blue panda. */
export default function Avatar({ url, size = 32 }: { url?: string | null; size?: number }) {
  return (
    <span
      className="inline-block rounded-full overflow-hidden bg-[#EAF2FF] flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <PandaFace />
      )}
    </span>
  );
}

function PandaFace() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden>
      {/* ears */}
      <circle cx="24" cy="24" r="15" fill="#3B82F6" />
      <circle cx="76" cy="24" r="15" fill="#3B82F6" />
      {/* face */}
      <circle cx="50" cy="54" r="38" fill="#F8FBFF" />
      {/* eye patches */}
      <ellipse cx="36" cy="50" rx="11" ry="14" fill="#3B82F6" transform="rotate(-18 36 50)" />
      <ellipse cx="64" cy="50" rx="11" ry="14" fill="#3B82F6" transform="rotate(18 64 50)" />
      {/* eyes */}
      <circle cx="37" cy="52" r="4.5" fill="#0F172A" />
      <circle cx="63" cy="52" r="4.5" fill="#0F172A" />
      <circle cx="38.5" cy="50.5" r="1.4" fill="#fff" />
      <circle cx="64.5" cy="50.5" r="1.4" fill="#fff" />
      {/* nose + mouth */}
      <ellipse cx="50" cy="66" rx="4" ry="3" fill="#0F172A" />
      <path d="M50 69 Q50 74 45 75 M50 69 Q50 74 55 75" stroke="#0F172A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}
