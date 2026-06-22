import pg from 'pg';
import type { SectorScoreType, AnomalyEventType } from 'shared-types';
import { MOCK_SCORES, MOCK_ANOMALIES } from '../app/dashboard/mockData';

/**
 * Where the dashboard data came from:
 *   - 'live'  : real rows from the database
 *   - 'empty' : DB reachable but no scores yet (pipeline hasn't run)
 *   - 'mock'  : demo data (only when USE_MOCK_DATA=true, or DB error with mock allowed)
 *   - 'error' : DB query failed and mock is not enabled
 */
export type DataSource = 'live' | 'empty' | 'mock' | 'error';

export interface SectorData {
  scores: SectorScoreType[];
  anomalies: AnomalyEventType[];
  source: DataSource;
}

// Reuse a single pool across requests instead of opening/closing per call.
let _pool: pg.Pool | null = null;
function getPool(): pg.Pool {
  if (!_pool) {
    _pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _pool;
}

const mockEnabled = (): boolean => process.env.USE_MOCK_DATA === 'true';

const SCORES_QUERY = `
  SELECT DISTINCT ON (sector)
    sector, score, traffic_light, beginner_label,
    signal_breakdown, run_time, run_window, is_partial, data_completeness
  FROM sector_scores
  ORDER BY sector, run_time DESC
`;

const ANOMALIES_QUERY = `
  SELECT sector, anomaly_type, severity, raw_data, alert_text,
         historical_context, disclaimer, detected_at
  FROM anomaly_events
  WHERE detected_at::date = CURRENT_DATE
  ORDER BY detected_at DESC
`;

function mapScores(rows: Record<string, unknown>[]): SectorScoreType[] {
  return rows.map((r) => ({
    sector: r.sector as SectorScoreType['sector'],
    score: Number(r.score),
    traffic_light: r.traffic_light as SectorScoreType['traffic_light'],
    beginner_label: r.beginner_label as string,
    signal_breakdown: r.signal_breakdown as SectorScoreType['signal_breakdown'],
    computed_at: r.run_time as string,
    run_window: r.run_window as SectorScoreType['run_window'],
    is_partial: r.is_partial as boolean,
  }));
}

function mapAnomalies(rows: Record<string, unknown>[]): AnomalyEventType[] {
  return rows.map((r) => ({
    sector: r.sector as AnomalyEventType['sector'],
    anomaly_type: r.anomaly_type as AnomalyEventType['anomaly_type'],
    severity: r.severity as AnomalyEventType['severity'],
    raw_data: r.raw_data as Record<string, unknown>,
    alert_text: r.alert_text as string,
    historical_context: (r.historical_context as string | null) ?? undefined,
    disclaimer: r.disclaimer as string,
    detected_at: r.detected_at as string,
  }));
}

/**
 * Single source of truth for dashboard data. Returns real rows when available,
 * an honest 'empty' state when the DB is reachable but the pipeline hasn't run,
 * and only falls back to demo data when USE_MOCK_DATA=true. Errors are logged,
 * never silently masked as fresh data.
 */
export async function getSectorData(): Promise<SectorData> {
  try {
    const pool = getPool();
    const [scoresResult, anomaliesResult] = await Promise.all([
      pool.query<Record<string, unknown>>(SCORES_QUERY),
      pool.query<Record<string, unknown>>(ANOMALIES_QUERY),
    ]);

    if (scoresResult.rows.length === 0) {
      // DB works but no data yet. Show demo data only if explicitly opted in.
      if (mockEnabled()) {
        return { scores: MOCK_SCORES, anomalies: MOCK_ANOMALIES, source: 'mock' };
      }
      return { scores: [], anomalies: [], source: 'empty' };
    }

    return {
      scores: mapScores(scoresResult.rows),
      anomalies: mapAnomalies(anomaliesResult.rows),
      source: 'live',
    };
  } catch (err) {
    console.error('[getSectorData] Database error:', (err as Error).message);
    if (mockEnabled()) {
      return { scores: MOCK_SCORES, anomalies: MOCK_ANOMALIES, source: 'mock' };
    }
    return { scores: [], anomalies: [], source: 'error' };
  }
}
