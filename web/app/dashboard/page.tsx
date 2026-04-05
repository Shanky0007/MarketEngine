import ScoreDisclaimer from './components/ScoreDisclaimer';
import Navbar from '../components/Navbar';

export const metadata = {
  title: 'Sector Pulse Dashboard — Niftea',
  description: 'Live institutional flow intelligence across 7 Indian market sectors. Updated 3× daily.',
};

export default function DashboardPage() {
  return (
    <>
      <ScoreDisclaimer />
      <Navbar />
      <main className="max-w-[860px] mx-auto px-6 py-10">
        <p className="label">Sector Pulse Dashboard — coming soon</p>
      </main>
    </>
  );
}
