'use client';

export default function Disclaimer({ text }: { text: string }) {
  return (
    <div className="relative rounded overflow-hidden border border-[var(--amber)]/20">
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--amber)]/5 to-transparent" />
      <div className="relative flex gap-3 p-3 px-4">
        <div className="flex-shrink-0 mt-0.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--amber)]">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <p className="text-[12px] leading-[1.6] text-[var(--text-muted)]">{text}</p>
      </div>
    </div>
  );
}
