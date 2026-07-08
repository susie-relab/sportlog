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
      <circle cx="26" cy="24" r="15" fill="#3B82F6" />
      <circle cx="74" cy="24" r="15" fill="#3B82F6" />
      <circle cx="26" cy="24" r="7" fill="#60A5FA" />
      <circle cx="74" cy="24" r="7" fill="#60A5FA" />
      {/* face */}
      <circle cx="50" cy="55" r="39" fill="#F8FBFF" />
      {/* rosy cheeks */}
      <circle cx="27" cy="66" r="6" fill="#FBB6CE" opacity="0.75" />
      <circle cx="73" cy="66" r="6" fill="#FBB6CE" opacity="0.75" />
      {/* eye patches (big, cute) */}
      <ellipse cx="36" cy="52" rx="13" ry="15" fill="#3B82F6" transform="rotate(-12 36 52)" />
      <ellipse cx="64" cy="52" rx="13" ry="15" fill="#3B82F6" transform="rotate(12 64 52)" />
      {/* big eyes */}
      <circle cx="37" cy="53" r="8.5" fill="#fff" />
      <circle cx="63" cy="53" r="8.5" fill="#fff" />
      <circle cx="38" cy="54" r="5.5" fill="#0F172A" />
      <circle cx="62" cy="54" r="5.5" fill="#0F172A" />
      {/* sparkle highlights */}
      <circle cx="40.3" cy="51.3" r="2.2" fill="#fff" />
      <circle cx="64.3" cy="51.3" r="2.2" fill="#fff" />
      <circle cx="36" cy="56" r="1" fill="#fff" opacity="0.8" />
      <circle cx="60" cy="56" r="1" fill="#fff" opacity="0.8" />
      {/* nose */}
      <ellipse cx="50" cy="66" rx="3.6" ry="2.6" fill="#0F172A" />
      {/* big smile */}
      <path d="M40 71 Q50 80 60 71" stroke="#0F172A" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
