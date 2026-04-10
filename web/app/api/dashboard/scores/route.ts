import { NextResponse } from 'next/server';
import { MOCK_SCORES, MOCK_ANOMALIES } from '../../../dashboard/mockData';
import type { SectorScoreType, AnomalyEventType } from 'shared-types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pg = await import('pg');
    const pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL });

    const [scoresResult, anomaliesResult] = await Promise.all([
      pool.query<{
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
      `),
      pool.query<{
        sector: string; anomaly_type: string; severity: string;
        raw_data: unknown; alert_text: string; historical_context: string | null;
        disclaimer: string; detected_at: string;
      }>(`
        SELECT sector, anomaly_type, severity, raw_data, alert_text,
               historical_context, disclaimer, detected_at
        FROM anomaly_events
        WHERE detected_at::date = CURRENT_DATE
        ORDER BY detected_at DESC
      `),
    ]);

    await pool.end();

    const scores: SectorScoreType[] = scoresResult.rows.map(r => ({
      sector:          r.sector as SectorScoreType['sector'],
      score:           r.score,
      traffic_light:   r.traffic_light as SectorScoreType['traffic_light'],
      beginner_label:  r.beginner_label,
      signal_breakdown: r.signal_breakdown as SectorScoreType['signal_breakdown'],
      computed_at:     r.run_time,
      run_window:      r.run_window as SectorScoreType['run_window'],
      is_partial:      r.is_partial,
    }));

    const anomalies: AnomalyEventType[] = anomaliesResult.rows.map(r => ({
      sector:             r.sector as AnomalyEventType['sector'],
      anomaly_type:       r.anomaly_type as AnomalyEventType['anomaly_type'],
      severity:           r.severity as AnomalyEventType['severity'],
      raw_data:           r.raw_data as Record<string, unknown>,
      alert_text:         r.alert_text,
      historical_context: r.historical_context ?? undefined,
      disclaimer:         r.disclaimer,
      detected_at:        r.detected_at,
    }));

    return NextResponse.json({ scores, anomalies });
  } catch {
    return NextResponse.json({ scores: MOCK_SCORES, anomalies: MOCK_ANOMALIES });
  }
}
