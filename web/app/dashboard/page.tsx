import ScoreDisclaimer from './components/ScoreDisclaimer';
import LiveDashboard from './components/LiveDashboard';
import Navbar from '../components/Navbar';
import { MOCK_SCORES, MOCK_ANOMALIES } from './mockData';
import type { SectorScoreType, AnomalyEventType } from 'shared-types';

export const metadata = {
  title: 'Sector Pulse Dashboard — Niftea',
  description: 'Live institutional flow intelligence across 7 Indian market sectors. Updated 3× daily.',
};

// Fetch latest scores from DB (one per sector, most recent run)
async function getLatestScores(): Promise<SectorScoreType[]> {
  try {
    const pg = await import('pg');
    const pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL });

    const { rows } = await pool.query<{
      sector: string; score: number; traffic_light: string;
      beginner_label: string; signal_breakdown: unknown;
      run_time: string; run_window: string; is_partial: boolean;
      data_completeness: number;
    }>(`
      SELECT DISTINCT ON (sector)
        sector, score, traffic_light, beginner_label,
        signal_breakdown, run_time, run_window, is_partial, data_completeness
      FROM sector_scores
      ORDER BY sector, run_time DESC
    `);

    await pool.end();

    return rows.map(r => ({
      sector:          r.sector as SectorScoreType['sector'],
      score:           r.score,
      traffic_light:   r.traffic_light as SectorScoreType['traffic_light'],
      beginner_label:  r.beginner_label,
      signal_breakdown: r.signal_breakdown as SectorScoreType['signal_breakdown'],
      computed_at:     r.run_time,
      run_window:      r.run_window as SectorScoreType['run_window'],
      is_partial:      r.is_partial,
    }));
  } catch {
    return MOCK_SCORES;
  }
}

// Fetch anomalies from today
async function getTodayAnomalies(): Promise<AnomalyEventType[]> {
  try {
    const pg = await import('pg');
    const pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL });

    const { rows } = await pool.query<{
      sector: string; anomaly_type: string; severity: string;
      raw_data: unknown; alert_text: string; historical_context: string | null;
      disclaimer: string; detected_at: string;
    }>(
      `SELECT sector, anomaly_type, severity, raw_data, alert_text,
              historical_context, disclaimer, detected_at
       FROM anomaly_events
       WHERE detected_at::date = CURRENT_DATE
       ORDER BY detected_at DESC`
    );

    await pool.end();

    return rows.map(r => ({
      sector:             r.sector as AnomalyEventType['sector'],
      anomaly_type:       r.anomaly_type as AnomalyEventType['anomaly_type'],
      severity:           r.severity as AnomalyEventType['severity'],
      raw_data:           r.raw_data as Record<string, unknown>,
      alert_text:         r.alert_text,
      historical_context: r.historical_context ?? undefined,
      disclaimer:         r.disclaimer,
      detected_at:        r.detected_at,
    }));
  } catch {
    return MOCK_ANOMALIES;
  }
}

export default async function DashboardPage() {
  const [scores, anomalies] = await Promise.all([getLatestScores(), getTodayAnomalies()]);

  return (
    <>
      <ScoreDisclaimer />
      <Navbar />
      <main className="max-w-[860px] mx-auto px-6 py-10 flex flex-col gap-8">

        {/* Live-updating header + sector grid (polls every 60s) */}
        <LiveDashboard initialScores={scores} initialAnomalies={anomalies} />

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
