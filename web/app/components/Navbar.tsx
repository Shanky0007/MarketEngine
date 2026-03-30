'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0d0d0f]/80 border-b border-[var(--border)]">
      <div className="max-w-[860px] mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image src="/logo-horizontal.jpg" alt="Niftea" width={140} height={36} className="h-8 w-auto rounded mix-blend-lighten" />
        </Link>
        <div className="flex items-center gap-8">
          <Link href="/" className="text-[13px] font-medium uppercase tracking-[0.06em] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150">Briefs</Link>
          <div className="h-4 w-px bg-[var(--border)]" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--green)] pulse-dot" />
            <span className="text-[12px] font-medium text-[var(--text-muted)]">Pipeline Active</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
