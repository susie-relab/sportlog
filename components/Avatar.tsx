/** Circular avatar — shows the user's uploaded photo, or a default cute blue panda. */
export default function Avatar({ url, size = 32 }: { url?: string | null; size?: number }) {
  return (
    <span
      className="inline-block rounded-full overflow-hidden bg-[#7DBEF5] flex-shrink-0"
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
      <circle cx="28" cy="20" r="13" fill="#1E293B" />
      <circle cx="72" cy="20" r="13" fill="#1E293B" />
      {/* face */}
      <circle cx="50" cy="55" r="35" fill="#FFFFFF" />
      {/* rosy cheeks */}
      <circle cx="27" cy="66" r="5.5" fill="#FBB6CE" opacity="0.75" />
      <circle cx="73" cy="66" r="5.5" fill="#FBB6CE" opacity="0.75" />
      {/* eye patches (simple, symmetric ovals) */}
      <ellipse cx="34" cy="55" rx="10.5" ry="13.5" fill="#1E293B" />
      <ellipse cx="66" cy="55" rx="10.5" ry="13.5" fill="#1E293B" />
      {/* eyes */}
      <circle cx="34" cy="57" r="4.5" fill="#fff" />
      <circle cx="66" cy="57" r="4.5" fill="#fff" />
      <circle cx="35" cy="58" r="1.6" fill="#1E293B" />
      <circle cx="67" cy="58" r="1.6" fill="#1E293B" />
      {/* nose */}
      <ellipse cx="50" cy="67" rx="3.2" ry="2.4" fill="#1E293B" />
      {/* smile */}
      <path d="M45 72 Q50 76 55 72" stroke="#1E293B" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
