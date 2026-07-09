/** Circular avatar — shows the user's uploaded photo, or a default blue panda. */
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
      <circle cx="26" cy="24" r="16" fill="#3B82F6" />
      <circle cx="74" cy="24" r="16" fill="#3B82F6" />
      {/* face */}
      <circle cx="50" cy="56" r="36" fill="#3B82F6" />
      {/* eye patches */}
      <ellipse cx="35" cy="54" rx="14" ry="17" fill="#1D4ED8" />
      <ellipse cx="65" cy="54" rx="14" ry="17" fill="#1D4ED8" />
      {/* big eyes */}
      <circle cx="35" cy="55" r="10" fill="#fff" />
      <circle cx="65" cy="55" r="10" fill="#fff" />
      <circle cx="36" cy="57" r="5.5" fill="#0F172A" />
      <circle cx="66" cy="57" r="5.5" fill="#0F172A" />
      <circle cx="39" cy="52" r="2.2" fill="#fff" />
      <circle cx="69" cy="52" r="2.2" fill="#fff" />
      {/* nose */}
      <ellipse cx="50" cy="70" rx="4" ry="3" fill="#1D4ED8" />
      {/* big smile */}
      <path d="M38 76 Q50 88 62 76" stroke="#1D4ED8" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
