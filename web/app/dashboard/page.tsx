import ScoreDisclaimer from './components/ScoreDisclaimer';
import LiveDashboard from './components/LiveDashboard';
import Navbar from '../components/Navbar';
import { getSectorData } from '../../lib/sectorData';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sector Pulse Dashboard — Niftea',
  description: 'Live institutional flow intelligence across 7 Indian market sectors. Updated 3× daily.',
};

export default async function DashboardPage() {
  const { scores, anomalies, source } = await getSectorData();

  return (
    <>
      <ScoreDisclaimer />
      <Navbar />
      <main className="max-w-[860px] mx-auto px-6 py-10 flex flex-col gap-8">

        {/* Live-updating header + sector grid (polls every 60s) */}
        <LiveDashboard initialScores={scores} initialAnomalies={anomalies} initialSource={source} />

        {/* Footer disclaimer */}
        <footer className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Scores are computed deterministically from public institutional flow data.
            They describe what institutional investors have been doing — not what you should do.
            Niftea is not a SEBI-registered investment adviser.{' '}
            <span style={{ color: 'var(--border-light)' }}>
              Data sourced from NSE · BSE · SEBI · AMFI
            </span>
          </p>
        </footer>

      </main>
    </>
  );
}
