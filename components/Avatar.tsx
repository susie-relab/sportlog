/** Circular avatar — shows the user's uploaded photo, or a default cute blue panda. */
export default function Avatar({ url, size = 32 }: { url?: string | null; size?: number }) {
  return (
    <span
      className="inline-block rounded-full overflow-hidden bg-[#3B82F6] flex-shrink-0"
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
      <circle cx="25" cy="22" r="15" fill="#1E293B" />
      <circle cx="75" cy="22" r="15" fill="#1E293B" />
      {/* face */}
      <circle cx="50" cy="56" r="38" fill="#FCFCFD" />
      {/* rosy cheeks */}
      <circle cx="25" cy="68" r="7" fill="#FBB6CE" opacity="0.8" />
      <circle cx="75" cy="68" r="7" fill="#FBB6CE" opacity="0.8" />
      {/* eye patches (big, cute) */}
      <ellipse cx="34" cy="52" rx="15" ry="18" fill="#1E293B" transform="rotate(-10 34 52)" />
      <ellipse cx="66" cy="52" rx="15" ry="18" fill="#1E293B" transform="rotate(10 66 52)" />
      {/* big eyes */}
      <circle cx="35" cy="53" r="10" fill="#fff" />
      <circle cx="65" cy="53" r="10" fill="#fff" />
      <circle cx="36" cy="55" r="6" fill="#1E293B" />
      <circle cx="64" cy="55" r="6" fill="#1E293B" />
      {/* sparkle highlights */}
      <circle cx="39" cy="51" r="2.6" fill="#fff" />
      <circle cx="67" cy="51" r="2.6" fill="#fff" />
      <circle cx="34" cy="58" r="1.1" fill="#fff" opacity="0.85" />
      <circle cx="62" cy="58" r="1.1" fill="#fff" opacity="0.85" />
      {/* nose */}
      <ellipse cx="50" cy="68" rx="4" ry="3" fill="#1E293B" />
      {/* smile */}
      <path d="M42 74 Q50 80 58 74" stroke="#1E293B" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}
