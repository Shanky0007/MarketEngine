'use client';

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)]">
      <div className="max-w-[860px] mx-auto px-6 h-16 flex items-center justify-between">
        <span className="text-[11px] text-[var(--text-muted)]">© 2026 Niftea. Not a SEBI-registered investment adviser.</span>
        <span className="text-[11px] text-[var(--text-muted)]">Data sourced from NSE · BSE · SEBI · AMFI · RBI</span>
      </div>
    </footer>
  );
}
