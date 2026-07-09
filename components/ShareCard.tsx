'use client';
import { useRef, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';

export interface ShareStat {
  label: string;
  value: string;
}

interface Props {
  kind: 'activity' | 'week' | '30day' | 'pb';
  badge: string;      // small label pill, e.g. "PERSONAL BEST"
  title: string;      // big headline
  heroValue?: string; // optional large centered number (pace/PB kinds)
  heroLabel?: string;
  stats: ShareStat[];
  dateLabel: string;
  accentColor: string;
  onClose: () => void;
}

const CARD_W = 1080;
const CARD_H = 1920;

export default function ShareCard({ kind, badge, title, heroValue, heroLabel, stats, dateLabel, accentColor, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [scale, setScale] = useState(0.28);
  const [busy, setBusy] = useState<'idle' | 'rendering' | 'sharing'>('idle');
  const [err, setErr] = useState('');

  const centered = kind === 'pb' || kind === 'week';

  useEffect(() => {
    const fit = () => {
      const w = previewWrapRef.current?.parentElement?.clientWidth ?? 320;
      setScale(Math.min(0.36, (w - 8) / CARD_W));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgUrl(url => { if (url) URL.revokeObjectURL(url); return URL.createObjectURL(file); });
  };

  const removePhoto = () => {
    setBgUrl(url => { if (url) URL.revokeObjectURL(url); return null; });
    if (fileRef.current) fileRef.current.value = '';
  };

  const render = async (): Promise<File | null> => {
    if (!cardRef.current) return null;
    setErr('');
    const dataUrl = await toPng(cardRef.current, { width: CARD_W, height: CARD_H, pixelRatio: 1 });
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], 'sportlog-share.png', { type: 'image/png' });
  };

  const handleShare = async () => {
    setBusy('rendering');
    try {
      const file = await render();
      if (!file) throw new Error('Could not generate image.');
      setBusy('sharing');
      if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'SportLog' });
      } else {
        downloadFile(file);
      }
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') setErr(e.message || 'Could not share.');
    } finally {
      setBusy('idle');
    }
  };

  const handleDownload = async () => {
    setBusy('rendering');
    try {
      const file = await render();
      if (file) downloadFile(file);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not generate image.');
    } finally {
      setBusy('idle');
    }
  };

  const downloadFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-sm bg-[#1E293B] border border-[#334155] rounded-2xl p-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Share</h3>
          <button onClick={onClose} className="text-[#64748B] hover:text-white text-lg leading-none">✕</button>
        </div>

        {/* Preview (scaled) */}
        <div ref={previewWrapRef} className="mx-auto rounded-xl overflow-hidden border border-[#334155]" style={{ width: CARD_W * scale, height: CARD_H * scale }}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <div ref={cardRef} style={{ width: CARD_W, height: CARD_H, position: 'relative', overflow: 'hidden', fontFamily: 'var(--font-body)' }}>
              {/* Background */}
              {bgUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bgUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(150deg, ${accentColor} 0%, #0F172A 75%)` }} />
              )}
              {/* Overlay for legibility */}
              <div style={{ position: 'absolute', inset: 0, background: bgUrl ? 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.8) 100%)' : 'transparent' }} />

              {/* Content */}
              <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '72px 64px' }}>
                {/* Badge */}
                <div style={{ alignSelf: centered ? 'center' : 'flex-start' }}>
                  <span style={{
                    display: 'inline-block', padding: '10px 24px', borderRadius: 999,
                    background: accentColor, color: '#fff', fontSize: 26, fontWeight: 700,
                    letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: 'var(--font-display)',
                  }}>{badge}</span>
                </div>

                {/* Title */}
                <h1 style={{
                  color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 800,
                  fontSize: centered ? 64 : 52, textAlign: centered ? 'center' : 'left',
                  marginTop: 28, lineHeight: 1.15,
                }}>{title}</h1>

                {/* Hero stat (PB / week) */}
                {centered && heroValue && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <div style={{ color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 168, lineHeight: 1 }}>{heroValue}</div>
                    {heroLabel && <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 36, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2 }}>{heroLabel}</div>}
                  </div>
                )}

                {/* Stat tiles */}
                <div style={{
                  flex: centered && heroValue ? undefined : 1,
                  display: centered ? 'flex' : 'grid',
                  flexDirection: centered ? 'row' : undefined,
                  flexWrap: centered ? 'wrap' : undefined,
                  gridTemplateColumns: centered ? undefined : 'repeat(2, 1fr)',
                  gap: 24,
                  justifyContent: centered ? 'center' : undefined,
                  alignContent: centered ? undefined : 'space-evenly',
                  marginTop: centered && !heroValue ? 48 : (centered ? 0 : 48),
                  marginBottom: 24,
                }}>
                  {stats.map((s, i) => (
                    <div key={i} style={{
                      background: 'rgba(15,23,42,0.55)', border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 24, padding: '28px 32px', minWidth: centered ? 220 : undefined,
                      textAlign: centered ? 'center' : 'left', backdropFilter: 'blur(4px)',
                    }}>
                      <div style={{ color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 56 }}>{s.value}</div>
                      <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 26, fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 26, fontWeight: 600 }}>{dateLabel}</span>
                  <span style={{ color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32 }}>🏃 SportLog</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Background photo controls */}
        <div className="flex items-center gap-2 mt-4">
          <button onClick={() => fileRef.current?.click()} className="btn-secondary text-xs px-3 py-2 flex-1">
            {bgUrl ? '🖼 Change photo' : '🖼 Add photo from gallery'}
          </button>
          {bgUrl && <button onClick={removePhoto} className="text-xs text-[#64748B] hover:text-white px-2">Remove</button>}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
        </div>

        {err && <p className="text-xs text-red-400 mt-2">{err}</p>}

        <div className="flex gap-2 mt-4">
          <button onClick={handleShare} disabled={busy !== 'idle'} className="btn-primary flex-1">
            {busy === 'rendering' ? 'Generating…' : busy === 'sharing' ? 'Sharing…' : '↗ Share'}
          </button>
          <button onClick={handleDownload} disabled={busy !== 'idle'} className="btn-secondary px-4">⬇</button>
        </div>
      </div>
    </div>
  );
}
