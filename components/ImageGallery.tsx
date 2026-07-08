'use client';
import { useState } from 'react';

/** Read-only thumbnail strip; tap a thumb to view full-size in a lightbox. */
export default function ImageGallery({ urls, size = 'sm' }: { urls?: string[] | null; size?: 'sm' | 'md' }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  if (!urls || urls.length === 0) return null;
  const dim = size === 'md' ? 'w-24 h-24' : 'w-16 h-16';

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {urls.map(url => (
          <button key={url} type="button" onClick={() => setLightbox(url)}
            className={`${dim} rounded-lg overflow-hidden border border-[#334155] flex-shrink-0`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
      {lightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85" onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-lg object-contain" />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white text-2xl leading-none">✕</button>
        </div>
      )}
    </>
  );
}
