'use client';

export interface ToastMsg {
  text: string;
  ok: boolean;
}

/** A temporary floating notification, bottom-center, auto-dismissed by the caller's timeout. */
export default function Toast({ msg }: { msg: ToastMsg | null }) {
  if (!msg) return null;
  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[80] px-4 w-full max-w-sm">
      <div className={`p-3 rounded-lg border text-sm text-center shadow-lg ${msg.ok ? 'bg-green-900/90 border-green-700 text-green-300' : 'bg-red-900/90 border-red-700 text-red-300'}`}>
        {msg.text}
      </div>
    </div>
  );
}
