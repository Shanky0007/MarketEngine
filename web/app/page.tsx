import { getLatestBrief, getAllBriefs } from '@/lib/db';
import BriefCard from './components/BriefCard';
import Navbar from './components/Navbar';
import TickerStrip from './components/TickerStrip';
import Footer from './components/Footer';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const latest = await getLatestBrief();
  const allBriefs = await getAllBriefs();

  return (
    <>
      <Navbar />
      <TickerStrip />

      <main className="min-h-screen pb-12">
        {/* Header */}
        <div className="max-w-[860px] mx-auto px-6 pt-12 pb-6 text-center">
          <div className="flex justify-center mb-5">
            <img src="/logo-full.jpg" alt="Niftea" className="h-24 w-auto rounded-lg mix-blend-lighten" />
          </div>
          <span className="label tracking-[0.12em]">Daily Intelligence</span>
          <p className="text-[13px] text-[var(--text-secondary)] mt-3">
            Your morning chai with the markets · AI-generated briefs · Two reading levels
          </p>
        </div>

        {/* Divider */}
        <div className="max-w-[860px] mx-auto px-6"><div className="border-t border-[var(--border)]" /></div>

        {/* Latest brief */}
        <div className="max-w-[860px] mx-auto px-6 pt-12">
          {latest ? (
            <BriefCard brief={latest} />
          ) : (
            <div className="card-skeuo p-12 text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-[18px] font-bold text-[var(--text-primary)] mb-2 tracking-[-0.02em]">No briefs yet</h3>
              <p className="text-[var(--text-secondary)] text-[14px]">Run the pipeline to generate your first market brief.</p>
              <code className="inline-block mt-4 font-data text-[12px] bg-[var(--surface)] px-4 py-2 rounded-lg text-[var(--text-muted)] border border-[var(--border)]">
                POST http://localhost:3001/api/trigger
              </code>
            </div>
          )}
        </div>

        {/* Archive */}
        {allBriefs.length > 1 && (
          <div className="max-w-[860px] mx-auto px-6 pt-12">
            {/* Divider */}
            <div className="border-t border-[var(--border)] mb-12" />

            <div className="flex items-center gap-3 mb-6">
              <span className="label">Archive</span>
              <div className="h-px flex-1 bg-[var(--border)]" />
              <span className="font-data text-[11px] text-[var(--text-muted)]">{allBriefs.length} briefs</span>
            </div>
            <div className="grid gap-3">
              {allBriefs.map((b) => (
                <Link
                  key={b.id}
                  href={`/brief/${b.brief_date}`}
                  className="card-skeuo p-5 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center font-data text-[12px] text-[var(--text-muted)]">
                      {b.brief_date?.split('-')[2]}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-[var(--text-primary)] group-hover:text-[var(--gold)] transition-colors duration-150">
                        {b.beginner_headline}
                      </p>
                      <p className="font-data text-[11px] text-[var(--text-muted)] mt-0.5">{b.brief_date}</p>
                    </div>
                  </div>
                  <span className="text-[var(--text-muted)] group-hover:text-[var(--gold)] transition-colors duration-150">→</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
