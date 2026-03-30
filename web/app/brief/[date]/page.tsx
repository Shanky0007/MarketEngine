import { getBriefByDate } from '@/lib/db';
import BriefCard from '@/app/components/BriefCard';
import Navbar from '@/app/components/Navbar';
import TickerStrip from '@/app/components/TickerStrip';
import Footer from '@/app/components/Footer';
import Link from 'next/link';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ date: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  const brief = await getBriefByDate(date);
  if (!brief) return { title: 'Brief not found' };

  return {
    title: `${brief.brief_date} — ${brief.beginner_headline} | Niftea`,
    description: brief.beginner_takeaway,
    openGraph: {
      title: brief.beginner_headline,
      description: brief.beginner_takeaway,
      images: [`/api/og/${brief.brief_date}`]
    }
  };
}

export default async function BriefPage({ params }: Props) {
  const { date } = await params;
  const brief = await getBriefByDate(date);

  if (!brief) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex items-center justify-center">
          <div className="card-skeuo p-12 text-center max-w-md">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-[18px] font-bold text-[var(--text-primary)] mb-2 tracking-[-0.02em]">Brief not found</h3>
            <p className="text-[var(--text-secondary)] text-[14px] mb-6">No brief exists for <span className="font-data">{date}</span></p>
            <Link href="/" className="text-[var(--gold)] hover:underline text-[13px]">← Back to archive</Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <TickerStrip />
      <main className="min-h-screen pb-12">
        <div className="max-w-[860px] mx-auto px-6 pt-8">
          <Link href="/" className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors duration-150 text-[13px] mb-6">
            ← Back to archive
          </Link>
          <BriefCard brief={brief} />
        </div>
      </main>
      <Footer />
    </>
  );
}
